
const { parentPort } = require('worker_threads');
const c_cache_manager = require('./../classes/cache_manager')
let intrv = -1
const frequency_refresh = 1000 * 15



try{

  const dgram = require('dgram');
  const server = dgram.createSocket('udp4');
  const cache_manager = new c_cache_manager(server)
  parentPort.on('message', (msg) => {
    console.log('funciona el worker')
    const arr_port_address = msg.split('---')
    cache_manager.add_entity(arr_port_address[0], arr_port_address[1])
  });
  server.on('message', (msg, rinfo) => {
    cache_manager.entity_update(rinfo.address, rinfo.port)
    parentPort.postMessage(`${'UPDATE'}---${rinfo.address}---${rinfo.port}---${msg.toString('hex')}`);
  });
  server.on('listening', () => {
    const saddress = server.address();
    console.log(`Servidor UDP escuchando en ${saddress.address}:${saddress.port}`);
    console.log(`------INICIO DE LA ESCUCHA------`);
    start()

  });

  server.on('error', (err) => {
    console.error(`Error en el servidor: ${err.message}`);
    server.close();
  });

  // Configuración del servidor
  const HOST = '0.0.0.0';
  server.bind(8989, HOST);

  function start(){
    setInterval(async ()=>{
      console.log('iniciando intervalo')
      if(cache_manager.is_refresh()){
        console.warn('ya se esta refrescando la cache')
        return
      }
      cache_manager.set_refresh(true)
      try{
        await cache_manager.send_update_tick()
        cache_manager.set_refresh(false)
          
      }catch(err){
          cache_manager.set_refresh(false)
          console.error(new Error(err.stack))
          console.error(new Error(err))
        
      }
    },frequency_refresh)
  }
}catch(err){
  if(intrv){
    intrv
  }
  console.error(new Error(err.stack))
  throw new Error(err)
}