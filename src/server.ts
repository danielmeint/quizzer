import {
  User,
  clients,
  games,
  generateUniqueId,
  handleClose,
  handleCreateGame,
  handleJoinGame,
  handleSubmitAnswer,
  handleSubmitSolution,
  handleUsername,
  user,
} from ".";

export const server = Bun.serve<User>({
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

      ws.send(JSON.stringify({ type: "id", id: id })); // Send the id to the client

      // send the list of games to the client
      ws.send(JSON.stringify({ type: "games", games: games }));
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
      handleClose(ws);
    },
  },
});
