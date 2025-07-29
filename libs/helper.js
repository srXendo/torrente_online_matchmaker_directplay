const { parentPort } = require('worker_threads');
const dgram = require('dgram');
const c_cache_manager = require('./../classes/cache_manager');

const FREQUENCY_REFRESH = 1000 * 15; // 15 segundos
const HOST = '0.0.0.0';
const PORT = 8989;

let intervalId = null;

try {
  const server = dgram.createSocket('udp4');
  const cache_manager = new c_cache_manager(server);

  // Escucha mensajes del hilo principal (nuevas entidades a monitorear)
  parentPort.on('message', (msg) => {
    const [address, port] = msg.split('---');
    if (address && port) {
      console.log(`📥 [\x1b[35mWORKER\x1b[0m] Registrando nueva entidad: ${address}:${port}`);
      cache_manager.add_entity(address, port);
    } else {
      console.warn(`⚠️ [\x1b[35mWORKER\x1b[0m] Mensaje malformado: "${msg}"`);
    }
  });

  // Escucha respuestas de las partidas vivas
  server.on('message', (msg, rinfo) => {
    console.log(`📡 [\x1b[35mWORKER\x1b[0m] Respuesta recibida de ${rinfo.address}:${rinfo.port}`);
    cache_manager.entity_update(rinfo.address, rinfo.port);

    // Enviar la actualización al hilo principal
    parentPort.postMessage(`UPDATE---${rinfo.address}---${rinfo.port}---${msg.toString('hex')}`);
  });

  server.on('listening', () => {
    const saddress = server.address();
    console.log(`📢 [\x1b[35mWORKER\x1b[0m] Escuchando en ${saddress.address}:${saddress.port}`);
    startRefreshLoop();
  });

  server.on('error', (err) => {
    console.error(`❌ [\x1b[35mWORKER\x1b[0m] Error en socket UDP: ${err.message}`);
    server.close();
  });

  server.bind(PORT, HOST);

  function startRefreshLoop() {
    intervalId = setInterval(async () => {
      if (cache_manager.is_refresh()) {
        console.warn('🔁 [\x1b[35mWORKER\x1b[0m] Caché ya está en refresco, omitiendo...');
        return;
      }

      cache_manager.set_refresh(true);

      try {
        console.log('🔄 [\x1b[35mWORKER\x1b[0m] Ejecutando tick de actualización');
        const updated = await cache_manager.send_update_tick();
        console.log(`✅ [\x1b[35mWORKER\x1b[0m] Refrescadas ${updated.filter(Boolean).length} entidades`);
      } catch (err) {
        console.error('❌ [\x1b[35mWORKER\x1b[0m] Error durante tick de actualización:', err.stack || err);
      } finally {
        cache_manager.set_refresh(false);
      }
    }, FREQUENCY_REFRESH);
  }

} catch (err) {
  if (intervalId) {
    clearInterval(intervalId);
  }
  console.error('💥 [\x1b[35mWORKER\x1b[0m] Error crítico:', err.stack || err);
  throw err;
}
