import { ServerWebSocket } from "bun";

const clients = new Map<string, ServerWebSocket<User>>();

let user = {
  id: "",
  username: "",
  game: "",
  isHost: false,
  score: 0,
  answers: [],
};

// export type User = typeof user;

export type User = {
  id: string;
  username: string;
  game: string;
  isHost: boolean;
  score: number; // User's score
  answers: string[]; // Array to store user's answers
};

const server = Bun.serve<User>({
  fetch(req, server) {
    if (server.upgrade(req, { data: { ...user } })) return;
    return new Response(null, {
      status: 301,
      headers: {
        Location: "https://railway.app/template/BLofAq?referralCode=bonus",
      },
    });
  },
  websocket: {
    open(ws) {
      const id = generateUniqueId(); // Implement this function to generate a unique ID
      clients.set(id, ws);
      ws.data.id = id;
      //   ws.data = { ...user, id, answers: [], score: 0 }; // Store the id in ws.data

      ws.send(`Welcome to the Game! Your id is ${id}`);
    },
    message(ws, message) {
      if (typeof message !== "string") return;

      try {
        const data = JSON.parse(message);

        switch (data.type) {
          case "setUsername":
            handleUsername(ws, data.username);
            break;
          case "createGame":
            handleCreateGame(ws, data.gameName);
            break;
          case "joinGame":
            handleJoinGame(ws, data.gameName);
            break;
          case "submitAnswer":
            handleSubmitAnswer(ws, data.answer);
            break;
          case "submitSolution":
            handleSubmitSolution(ws, data.solution);
            break;
          default:
            break;
        }
      } catch (e) {
        console.error(e);
      }
    },
    close(ws) {
      clients.delete(ws.data.id);

      server.publish(ws.data.game, `${ws.data.username} has left the game`);
    },
  },
});

// function broadcastGame(gameName: string, message: string) {
//   // Send a message to all users in the specified game
//   server.publish(gameName, message);
// }

function broadcastGame(gameName: string, message: string) {
  clients.forEach((client, id) => {
    if (client.data.game === gameName) {
      client.send(message);
    }
  });
}

function broadcastAll(message: string) {
  // Send a message to all users
  clients.forEach((client, id) => {
    client.send(message);
  });
}

process.on("SIGINT", () => {
  server.stop();
});

function handleSubmitAnswer(ws: ServerWebSocket<User>, answer: string) {
  broadcastGame(ws.data.game, `${ws.data.username} answered: ${answer}`);

  // add answer to user's answers
  ws.data.answers.push(answer);

  console.log(ws.data.answers);
}

function close(ws: ServerWebSocket<{ game: string; username: string }>) {
  throw new Error("Function not implemented.");
}

function handleSubmitSolution(
  ws: ServerWebSocket<{ game: string; username: string }>,
  solution: any
) {
  broadcastGame(ws.data.game, `${ws.data.username} submitted: ${solution}`);

  // for all users in the game, check if their answer matches the solution
  // if it does, increment their score
  clients.forEach((client, id) => {
    if (client.data.game === ws.data.game) {
      let username = client.data.username;
      let lastAnswer = client.data.answers[client.data.answers.length - 1];
      if (lastAnswer === solution) {
        console.log(`${username} got it right!`);
        client.data.score++;
      }
    }
  });
}

function handleUsername(ws: ServerWebSocket<User>, message: string) {
  ws.data.username = message;
}

function handleCreateGame(ws: ServerWebSocket<User>, message: string) {
  ws.data.game = message;
  ws.data.isHost = true;
  ws.subscribe(ws.data.game);
  ws.publish(ws.data.game, `${ws.data.username} has created the game`);
  ws.send(`You created the '${ws.data.game}' game`);
}

function handleJoinGame(ws: ServerWebSocket<User>, message: string) {
  ws.data.game = message;
  ws.subscribe(ws.data.game);
  ws.publish(ws.data.game, `${ws.data.username} has joined the game`);
  ws.send(`You joined the '${ws.data.game}' game`);
}

function generateUniqueId() {
  return Math.random().toString(36).substr(2, 9);
}
