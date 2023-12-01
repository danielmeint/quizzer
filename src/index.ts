import { ServerWebSocket } from "bun";

const clients = new Map<string, ServerWebSocket<User>>();
const games: string[] = [];

const user = {
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

const sendJson = (ws: ServerWebSocket<User>, data: any) => {
  ws.send(JSON.stringify(data));
};

const sendId = (ws: ServerWebSocket<User>, id: string) => {
  sendJson(ws, { type: "id", id: id });
};

const sendGames = (ws: ServerWebSocket<User>) => {
  sendJson(ws, { type: "games", games: games });
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
      sendId(ws, id);
      sendGames(ws);
      broadcastUsers();
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
            handleCreateGame(ws, data.game);
            break;
          case "joinGame":
            handleJoinGame(ws, data.game);
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
      handleClose(ws);
    },
  },
});

function handleClose(ws: ServerWebSocket<User>) {
  // Remove the user from the game
  clients.delete(ws.data.id);
  broadcastUsers();

  // if the user was the host, delete the game
  if (ws.data.isHost) {
    const index = games.indexOf(ws.data.game);
    if (index > -1) {
      games.splice(index, 1);
      broadcastGames();
    }
  }
}

process.on("SIGINT", () => {
  server.stop();
});

function handleSubmitAnswer(ws: ServerWebSocket<User>, answer: string) {
  // broadcastGame(ws.data.game, `${ws.data.username} answered: ${answer}`);

  // add answer to user's answers
  ws.data.answers.push(answer);

  console.log(ws.data.answers);
}

function close(ws: ServerWebSocket<{ game: string; username: string }>) {
  throw new Error("Function not implemented.");
}

function handleSubmitSolution(
  ws: ServerWebSocket<{ game: string; username: string }>,
  solution: string
) {
  // for all users in the game, check if their answer matches the solution
  for (const [id, client] of clients) {
    if (client.data.game === ws.data.game) {
      const username = client.data.username;
      const lastAnswer = client.data.answers[client.data.answers.length - 1];
      if (lastAnswer === solution) {
        client.data.score += 500;
      }
    }
  }

  broadcastUsers();
}

function handleUsername(ws: ServerWebSocket<User>, message: string) {
  ws.data.username = message;
  broadcastUsers();
}

function broadcastUsers() {
  for (const [id, client] of clients) {
    sendUsers(client);
  }
}

const sendUsers = (ws: ServerWebSocket<User>) => {
  const users = Array.from(clients.values()).map((client) => {
    return {
      username: client.data.username,
      score: client.data.score,
    };
  });
  sendJson(ws, { type: "users", users: users });
};

function handleCreateGame(ws: ServerWebSocket<User>, message: string) {
  ws.data.game = message;
  ws.data.isHost = true;
  games.push(ws.data.game);
  ws.subscribe(ws.data.game);
  console.log(games);
  broadcastGames();
}

function broadcastGames() {
  for (const [id, client] of clients) {
    sendGames(client);
  }
}

const gameExists = (game: string) => {
  return games.includes(game);
};

function handleJoinGame(ws: ServerWebSocket<User>, message: string) {
  if (!gameExists(message)) {
    ws.send(`Game '${message}' does not exist`);
    console.log(games);
    return;
  }
  // join game
  ws.data.game = message;
  ws.subscribe(ws.data.game);
  sendActiveGame(ws);
}

const sendActiveGame = (ws: ServerWebSocket<User>) => {
  sendJson(ws, { type: "activeGame", game: ws.data.game });
};

function generateUniqueId() {
  return Math.random().toString(36).substr(2, 9);
}
