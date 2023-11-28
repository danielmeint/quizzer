import { ServerWebSocket } from "bun";
// import { handleRoom, handleUsername } from "./utils";

const clients = new Map<string, ServerWebSocket<User>>();

let user = {
  id: "",
  room: "",
  username: "",
  score: 0,
  answers: [],
};

// export type User = typeof user;

export type User = {
  id: string;
  room: string;
  username: string;
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

      ws.send("Username:");
    },
    message(ws, message) {
      if (typeof message !== "string") return;

      try {
        const data = JSON.parse(message);

        switch (data.type) {
          case "setUsername":
            handleUsername(ws, data.username);
            break;
          case "createRoom":
            handleRoom(ws, data.roomName);
            break;
          case "joinRoom":
            handleRoom(ws, data.roomName);
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
      server.publish(ws.data.room, `${ws.data.username} has left the room`);
    },
  },
});

function broadcastRoom(roomName: string, message: string) {
  // Send a message to all users in the specified room
  server.publish(roomName, message);
}

process.on("SIGINT", () => {
  server.stop();
});

function handleSubmitAnswer(ws: ServerWebSocket<User>, answer: string) {
  broadcastRoom(ws.data.room, `${ws.data.username} answered: ${answer}`);

  // add answer to user's answers
  ws.data.answers.push(answer);
}

function close(ws: ServerWebSocket<{ room: string; username: string }>) {
  throw new Error("Function not implemented.");
}

function handleSubmitSolution(
  ws: ServerWebSocket<{ room: string; username: string }>,
  solution: any
) {
  broadcastRoom(ws.data.room, `${ws.data.username} submitted: ${solution}`);

  // for all users in the room, check if their answer matches the solution
  // if it does, increment their score
  server.clients.forEach((client) => {
    if (client.data.room === ws.data.room) {
      if (client.data.answers.includes(solution)) {
        client.data.score += 1;
      }
    }
  });
}

function handleUsername(ws: ServerWebSocket<User>, message: string) {
  if (!message.length) {
    ws.send("Username:");
    return;
  }
  ws.data.username = message;
  ws.send("Room:");
}

function handleRoom(ws: ServerWebSocket<User>, message: string) {
  if (!message.length) {
    ws.send("Room:");
    return;
  }
  ws.data.room = message;
  ws.subscribe(ws.data.room);
  ws.publish(ws.data.room, `${ws.data.username} has joined the room`);
  ws.send(`You joined the '${ws.data.room}' room`);
}

function generateUniqueId() {
  return Math.random().toString(36).substr(2, 9);
}
