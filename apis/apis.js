module.exports = function start_apis(manager_party){
   const http = require('http');
    console.log(manager_party)
    const PORT = 3000;

    const server = http.createServer((req, res) => {
    // Configurar cabeceras CORS
    res.setHeader('Access-Control-Allow-Origin', '*'); // Permite todas las solicitudes
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar preflight (OPTIONS)
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/party_list' && req.method === 'GET') {
        console.log('http-request nuevo mensaje:')
        const data = { mensaje: 'Lista de fiesta' };
        console.log()
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const response = {
          arr_partys: manager_party.get_arr_parties()
        }
        res.end(JSON.stringify(response));
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
    }
    });

    server.listen(PORT, () => {
        console.log(`Servidor escuchando en http://localhost:${PORT}`)
    });
}
const arr_party_list_mockup = [
  {
    "name": "💀 Gunner-24x7!!!!",
    "map": "MP_DM_LOVEBOAT",
    "players": "1 / 16",
    "time": 30,
    "ping": 21
  },
  {
    "name": "💣 SniperZone",
    "map": "MP_DM_CASTLE",
    "players": "5 / 16",
    "time": 12,
    "ping": 55
  },
  {
    "name": "🔫 UrbanWarfare",
    "map": "MP_DM_SUBWAY",
    "players": "12 / 16",
    "time": 45,
    "ping": 33
  },
  {
    "name": "🎯 ArenaXtreme",
    "map": "MP_DM_DOCKS",
    "players": "3 / 16",
    "time": 19,
    "ping": 42
  },
  {
    "name": "⚔️ DesertStorm",
    "map": "MP_DM_BAZAAR",
    "players": "14 / 16",
    "time": 38,
    "ping": 18
  },
  {
    "name": "💥 RocketRumble",
    "map": "MP_DM_RUINS",
    "players": "2 / 16",
    "time": 22,
    "ping": 60
  },
  {
    "name": "🧨 MinesBlaster",
    "map": "MP_DM_MINES",
    "players": "6 / 16",
    "time": 27,
    "ping": 35
  },
  {
    "name": "🚀 JetFrenzy",
    "map": "MP_DM_SPACEPORT",
    "players": "9 / 16",
    "time": 33,
    "ping": 47
  },
  {
    "name": "🔫 HeadshotOnly",
    "map": "MP_DM_HALL",
    "players": "8 / 16",
    "time": 29,
    "ping": 24
  },
  {
    "name": "🧱 CloseCombat",
    "map": "MP_DM_CORRIDORS",
    "players": "10 / 16",
    "time": 36,
    "ping": 39
  }
]