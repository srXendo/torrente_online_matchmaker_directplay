try{
const dgram = require('dgram');
const server = dgram.createSocket('udp4');
const c_manager_party = require('./classes/manager_party')
const manager_party = new c_manager_party()
const https = require('https');
//const {get_detail_data, set_detal_data, partys, ask_for_detail} = require('./libs/helper')


let token = ''
let last_start
let last_date

const fs = require('fs');
let sleep_checker_gunner = false;
function importarArrayDesdeArchivo() {
  if (!fs.existsSync('./save.log')) {
    // Crear archivo vacío con array vacío si no existe
    fs.writeFileSync('./save.log', '[]', 'utf-8');
    console.log(`⚠️ Archivo no encontrado. Se ha creado uno nuevo en: ${'./save.log'}`);
    return [];
  }

  try {
    const contenido = fs.readFileSync('./save.log', 'utf-8');
    const array = JSON.parse(contenido);
    const real = array.map(i=>{
      i.payload = Buffer.from(i.payload, 'hex')
      return i
    })
    console.log(`✅ Archivo leído correctamente desde: ${'./save.log'}`);
    return real;
  } catch (error) {
    console.error(`❌ Error al leer o parsear el archivo: ${error.message}`);
    return [];
  }
}
function exportarArrayAArchivo(array) {
  
  try {
    const arr_without_buffer = array.map(i=>{
      i.payload = i.payload.toString('hex')
      return i
    })
    const contenido = JSON.stringify(arr_without_buffer, null);
    fs.writeFileSync('./save.log', contenido, 'utf-8');
    console.log(`✅ Archivo creado o sobrescrito en: ${'./save.log'}`);
  } catch (error) {
    console.error(`❌ Error al escribir el archivo: ${error.message}`);
  }
}
/**
 * try a send message to ip and port servers game and sleep set next try in N mins
 * return void
 */
let aux_hex = "3F00030200113235352E3235352E3235352E323535000000000000000000000000000000000000000000000000000000248268772019470300005C0088E035030000000000000000B82200000010506344654D657361000000000000A013787878787878787878787878787878787878787878009013620000005C00000000002482687700E1350300005C000000000000000000201947030000000000A619002DA324966400000019000000505B6A002C82020890810208E8A519001C5B6A0080811580000000001C5B6A00185B6A000000000004A6190004A619001BD5D4551C5B6A00A0D7D207E0C8D455000000001CA619001FC9D455BC31D25538A7190048A6190058A61900D4AE19002D80D55558533F03BC31D25538A7190048A6190058A619000000000001000000EA82D55500000000C2030000B822000058533F03000000000100000000E1350348E73F034CE73F0304000000000000000200004D505F444D5F5645525449474F0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000806141E1E02FFFF000000000000"
let aux_gunner = [] //importarArrayDesdeArchivo()


function reemplazarNombreMapa(buffer, nombreActual, nombreNuevo) {
  const originalBytes = Buffer.from(nombreActual, 'ascii');
  const nuevoBytes = Buffer.from(nombreNuevo, 'ascii');


  // Buscar la posición del nombre actual en el buffer
  const offset = buffer.indexOf(originalBytes);
  if (offset === -1) {
    throw new Error('Nombre original no encontrado en el buffer');
  }

  // Crear copia del buffer para no mutar el original
  const nuevoBuffer = Buffer.from(buffer);

  // Sobrescribir los bytes con el nuevo nombre
  nuevoBytes.copy(nuevoBuffer, offset);

  // Rellenar con ceros si el nombre nuevo es más corto
  if (nuevoBytes.length < originalBytes.length) {
    nuevoBuffer.fill(0x00, offset + nuevoBytes.length, offset + originalBytes.length);
  }

  return nuevoBuffer;
}
function replaceGameName(buffer, newName) {
  const NAME_OFFSET = buffer.indexOf(Buffer.from('a013', 'hex')) + 2; // +2 para saltar el prefijo
  const NAME_LENGTH = 24; // 24 bytes = 48 caracteres ASCII hex

  const nameBuffer = Buffer.alloc(NAME_LENGTH, 0x00);
  nameBuffer.write(newName.slice(0, NAME_LENGTH), 'ascii');

  nameBuffer.copy(buffer, NAME_OFFSET);

  return buffer;
}
function obtenerPartidasDisponibles(callback) {
  const url = 'https://www.gunner.es/Game/sala/default.asp';

  https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      const partidas = [];

      // Buscar todas las filas con partidas
      const filas = data.match(/<tr><td[^>]*>.*?<\/tr>/gs);
      if (!filas) return callback([]);

      for (const fila of filas) {
        const columnas = [...fila.matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map(m => m[1].trim());

        if (columnas.length >= 4) {
          // Ignorar la fila de encabezado
          if (columnas[0].includes('Nombre Sala')) continue;

          const nombreSala = columnas[0].replace(/<[^>]+>/g, '').trim();
          const modalidadMatch = columnas[1].match(/>([^<]+)<\/a>/);
          const modalidad = modalidadMatch ? modalidadMatch[1] : columnas[1].replace(/<[^>]+>/g, '').trim();
          let ip = columnas[2].replace(/<[^>]+>/g, '').trim();
          const puerto = columnas[3].replace(/<[^>]+>/g, '').trim();


          if(ip === 'gunner.es'){
            ip = '90.77.110.65'
          }
          let template = aux_hex
          template = replaceBinaryIp(Buffer.from(template, 'hex'), ip, puerto)
          template = reemplazarNombreMapa(template, 'MP_DM_VERTIGO', modalidad)
          template = replaceGameName(template, nombreSala)
          manager_party.add_member(ip, puerto, template)
        }
      }
      console.log('Numero de partidas: ', manager_party.get_arr_parties().length )
      callback(partidas);
    });
  }).on('error', (err) => {
    console.error('Error al obtener los datos:', err.message);
    callback([]);
  });
}
setInterval(()=>{
  obtenerPartidasDisponibles(()=>{
 
})
}, 1000*120)
obtenerPartidasDisponibles(()=>{
 
})
function check_gunner(){
  const time_sleep = (1000*20) //milisegundos * segundos * minutos
    console.log('partys', partys)
    for(let ip in manager_party.get_parties()){
      for(let port in partys[ip]){
        if(partys[ip][port] && partys[ip][port].origin_payload){
         // ask_for_detail(ip, port, partys[ip][port].origin_payload)
        }
      }
    }
  if(!sleep_checker_gunner){
    sleep_checker_gunner = true
    setTimeout(()=>{ 
      sleep_checker_gunner = false
      check_gunner()
    }, time_sleep) 
  }
}

function replaceBinaryIp(buffer, newIpStr, newPort) {
  //cojemos byte de control de longitud.
  console.log(`remplaza ip. Buffer antiguo: ${buffer.toString('hex')}`)
    let oldBuffer = Buffer.from(buffer)
    const byte_separate = 0x11;
    const offset_start_ip = buffer.indexOf(byte_separate) +1;
    let offset_end_ip = -1
    for(let i = offset_start_ip; i < oldBuffer.length; i++){
      offset_end_ip = i
      if(oldBuffer.readUint8(i) === 0x00){
        
        break;
      }

    }
    
    if (offset_end_ip < 0) {
        console.warn("No se encontró ninguna IP ASCII en el buffer.");
        return buffer;
    }
    
    const originalIp = oldBuffer.slice(offset_start_ip, offset_end_ip);
    let paddedNewIp = newIpStr
    let last_part = oldBuffer.slice(offset_end_ip, oldBuffer.length)
    if(newIpStr.length < originalIp.length){
      paddedNewIp = newIpStr.padEnd(originalIp.length, '\x00');
    }else if(newIpStr.length > originalIp.length){
      paddedNewIp = newIpStr
      last_part = oldBuffer.slice(offset_end_ip + (newIpStr.length - originalIp.length), oldBuffer.length)
    }
    const ipBytes = Buffer.from(paddedNewIp, "ascii");
    const first_part = oldBuffer.slice(0, offset_start_ip);
    last_part.writeUint8(0x00, 0)
    oldBuffer = Buffer.concat([first_part, ipBytes, last_part])
    

    console.log(`Reemplazada IP "${originalIp}" -> "${newIpStr}" en offset ${offset_start_ip} hasta ${offset_end_ip}`);
            // Reemplazar port si aplica
  
          // Reemplazar port si aplica
  if (!!newPort) {
    const buf = oldBuffer
    let idx = -1;
    // buscamos la última ocurrencia de 0xB8,0x22
    let count_aux = 0;
    for (let i = 0; i < buf.length - 1; i++) {
      if (buf[i] === 0xB8 && buf[i + 1] === 0x22) {
        console.log('port encontrado')
        idx = i;
        if(count_aux === 0){
          break;
        }
        count_aux++
        
        break;
      }
    }
    if (idx === -1) {
      throw new Error('No se encontró la secuencia B8 22');
    }
    console.log(`idx encontrado: ${idx} - lenght del buffer${buf.length} = ${buf.length - idx}`)
    oldBuffer.writeUInt16LE(newPort, idx)
    // leemos little-endian: 0x22B8 = 8888

  }
  console.log(`remplaza ip. Buffer nuevo: ${oldBuffer.toString('hex')}`)
  return oldBuffer;
}

function extractIpAndPort(buffer) {

    const asciiString = buffer.toString('ascii');

    // Buscar IP en ASCII
    const ipRegex = /(\d{1,3}(?:\.\d{1,3}){3})/;
    const match = ipRegex.exec(asciiString);
    if (!match) return null;

    const ip = match[1];
    const ipOffset = asciiString.indexOf(ip);

    // Buscar 8888 (0x22B8) en formato LE => B8 22
    const PORT_VALUE = 8888;
    const portLE = Buffer.alloc(2);
    portLE.writeUInt16LE(PORT_VALUE, 0);

    const portOffset = buffer.indexOf(portLE, ipOffset);
    if (portOffset === -1) return { ip, port: null, ipOffset, portOffset: null };

    return {
        ip,
        port: buffer.readUInt16LE(portOffset),
        ipOffset,
        portOffset
    };
}
function get_port(buffer) {
  const portOffsetStart = 72 
  let portOffsetEnd = -1;
  for(let i = portOffsetStart; i < portOffsetStart + 3; i++){
    
    if(buffer[i] === 0x00){
      break;  
    }
    portOffsetEnd = i
  }
  if(portOffsetEnd < 0){
    console.error('puerto no encontrado')
    return false
  }
  return buffer.slice(portOffsetStart, portOffsetEnd + 1).readUint16LE(0)
}
let aux = []//[replaceBinaryIp(Buffer.from(aux_hex, 'hex'), "1.1.1.1")]
function process_date(date_start, date_hex){
      // Convertir el timestamp hexadecimal a número entero.
      let timestamp = date_hex

      const processingTime = Date.now() - date_start; // Tiempo en milisegundos

      // Sumamos el tiempo de procesamiento al timestamp.
      timestamp += processingTime;

      // Convertimos el nuevo timestamp de vuelta a hexadecimal.
      return Buffer.from(timestamp.toString('16').padStart(8, '0'),'hex');
}

function processCFRAME(message, rcon) {
  const bCommand = message.readUInt8(0);
  const bExtOpcode = message.readUInt8(1);
  let response = null
  let idSession = message.slice(8, 12)
  switch (bCommand) {
    case 0x7f:
      token = message
      console.log('Mensaje_type_4: 0x7f ', message.toString('hex'))
      console.log('Mensajes type 4 recibidos: ')
      const bSeq = message.readUInt8(2); // Secuencia del DFRAME
      const bNRcv = message.readUInt8(3); // Próximo esperado
      if(message.readUInt8(2) == 0x01){
        response = Buffer.from('7f000102c2000000000000000000000050000000010000000000000002000000e00000001400000000000000000000000000000000000000000000000000000093715e51dee002479ae27c0866e7511a3e49e9edc86a154f8d018b163200b9669071ce510900000000000000020000000000000091717e5100000000020400000200000000000000070000000000000000000000000000000000000000000000000000009071ce510000000000020000090000000000000007000000cc0000001400000000000000000000000000000000000000430068006100760061006c006f00740065000000430068006100760061006c006f00740065000000', 'hex')
      }else if(message.readUInt8(2) == 0x02){
        response = Buffer.from('3700020302000000af3f81c643686176616c6f746500e2060d00', 'hex')
      }
      break;
    case 0x3f:
      idSession = message.slice(4, 8)
      console.log('Mensaje_type_3: 0x3f ', message.toString('hex'))
      console.log('Mensajes type 3 recibidos: ')
      if(message.readUInt8(1) === 0x02){
        response = Buffer.alloc(8);
        response = Buffer.from('8006010004040000025a7318', 'hex')
        response.writeUInt8(message.readUInt8(3), 4); // bExtOpcode (SACK)
        response.writeUInt8(message.readUInt8(2), 5); // bExtOpcode (SACK)
        response.set(idSession, response.length - 4);        
        
      }else if(message.readUInt8(1) === 0x08){
        response = Buffer.alloc(8);
        response = Buffer.from('8006010004040000025a7318', 'hex')
        response.writeUInt8(message.readUInt8(3), 4); // bExtOpcode (SACK)
        response.writeUInt8(message.readUInt8(2), 5); // bExtOpcode (SACK)
        response.set(idSession, response.length - 4);
      }else if(message.readUInt8(1) === 0x07){
        response = Buffer.alloc(8);
        response = Buffer.from('8006010004040000025a7318', 'hex')
        response.writeUInt8(message.readUInt8(3), 4); // bExtOpcode (SACK)
        response.writeUInt8(message.readUInt8(2), 5); // bExtOpcode (SACK)
        response.set(idSession, response.length - 4);
      }else if(message.length >= 30 && message.length < 50){
        console.log('\n\ndataFilter!!! recive1111\n\n')
        /**/
        /*server.send(response, rcon.port, rcon.addres, (err)=>{
          console.error(err)
        })*/
        let last_idx = message.readUInt8(2) 
        const arr_payloads = manager_party.get_arr_payload( message.readUInt8(1), message.readUInt8(2), message.readUInt8(3))
               
        console.log(`Numero de partidas a enviar: ${arr_payloads.length}`)
        for(let payload of arr_payloads){
          console.log('payload send: ', payload.toString('hex'))
          server.send(payload, rcon.port, rcon.address, (err)=>{
              if(err){
                console.error('no se ha podido mandar partida')
              }
              console.log('partida enviada')
          })
        }
        let end_idx = 0x02 + arr_payloads.length
        response = Buffer.from('3f0803046b66c362', 'hex')
        response[3] = end_idx + 1
        response.writeUInt8(0x3f, 0); // bCommand
        response.writeUInt8(0x09, 1); // bExtOpcode (SACK)
      
        response.set(idSession, response.length - 4);

      }else if (message.length >= 50){
        
        const port = get_port(message)
        console.log('\n\ndatapart!!!\n\n', port)
        manager_party.add_member(rcon.address, `${port}`, replaceBinaryIp(message, rcon.address, false))
        response = Buffer.from('8006010004040000025a7318', 'hex')
        response.writeUInt8(message.readUInt8(3), 4); // bExtOpcode (SACK)
        response.writeUInt8(message.readUInt8(2) + 1, 5); // bExtOpcode (SACK)
        response.set(idSession, response.length - 4);

      }else if(message.readUInt8(1)=== 0x00){
        response = Buffer.from('8006010004040000025a7318', 'hex')
        response.writeUInt8(message.readUInt8(3), 4); // bExtOpcode (SACK)
        response.writeUInt8(message.readUInt8(2) + 1, 5); // bExtOpcode (SACK)
        response.set(idSession, response.length - 4);
      }else if(message.readUInt8(1) === 0x09){
        response = Buffer.from('80060100040400008f82d82d2', 'hex')
        response.writeUInt8(message.readUInt8(3), 4); // bExtOpcode (SACK)
        response.writeUInt8(message.readUInt8(2) + 1, 5); // bExtOpcode (SACK)
        
      }else if(message.readUInt8(1) === 0x03){
        response = Buffer.alloc(8);
        response = Buffer.from('8006010004040000025a7318', 'hex')
        response.writeUInt8(message.readUInt8(3), 4); // bExtOpcode (SACK)
        if(message.readUInt8(2) >= 255){
          message.writeUInt8(0, 2)
        }else{
          response.writeUInt8(message.readUInt8(2)+1, 5);
        }
         // bExtOpcode (SACK)

        response.set(idSession, response.length - 4);
      }else if(message.readUInt8(1) === 0x01){
        response = Buffer.from('8006010004040000025a7318', 'hex')
        response.writeUInt8(message.readUInt8(3), 4); // bExtOpcode (SACK)
        response.writeUInt8(message.readUInt8(2)+1, 5); // bExtOpcode (SACK)
        response.set(idSession, response.length - 4);
      }else if(message.readUInt8(2) === 0x03){
                response = Buffer.alloc(8);
        response = Buffer.from('8006010004040000025a7318', 'hex')
        response.writeUInt8(message.readUInt8(3), 4); // bExtOpcode (SACK)
        response.writeUInt8(message.readUInt8(2)+1, 5); // bExtOpcode (SACK)
      }
      
      break;
    case 0x80: // FRAME_EXOPCODE_SACK
      console.log('Mensaje_type_2: 0x80')
      console.log('Mensajes type 2 recibidos: ')
      if(message.readUInt8(1) === 0x06){
        if(message.readUint8(4) === 0x08 && message.readUInt8(5)===0x05){
          response = Buffer.from("3f080511",'hex')
        }else{
          response = Buffer.from("3f020000d2ed430c","hex")
        }
        /*response.set(process_date(Date.now(), parseInt(message.readUInt32LE(8), 16)), 8);*/
      }else if(message.readUInt8(1) === 0x02){
        response = Buffer.alloc(8);
        response.writeUInt8(0x3f, 0); // bCommand
        response.writeUInt8(0x02, 1); // bExtOpcode (SACK)
        response.writeUInt8(0x00 , 2); // bExtOpcode (SACK)
        response.writeUInt8(0x00, 3); // bExtOpcode (SACK)
        response.set(idSession, response.length - 4);
        
      }

      break;
    case 0x88:
      const startTime = Date.now(); // Tiempo de inicio (en milisegundos)
      last_start = startTime
      console.log('Mensaje_type_1: 0x88')
      console.log('Mensajes type 1 recibidos: ')
      response = Buffer.alloc(16);
      response.writeUInt8(0x88, 0);
      response.writeUInt8(0x02, 1);
      response.writeUInt8(message.readUInt8(3), 2);
      response.writeUInt8(message.readUInt8(3)+1, 2);
      response.writeUInt8(0x06, 4);
      response.writeUInt8(0x01, 6);
      response.set(idSession, response.length - 8);
      const timestampHex = message.readUInt32LE(12) // Extracto del Timestamp (en hexadecimal)
      const timestamp_calc = process_date(startTime, timestampHex)
      last_date = timestamp_calc
      response.set(timestamp_calc, 12);
      //console.log('response2 buffer: ', response)
      break;
    default:
      console.error('CFRAME no soportado: bExtOpcode desconocido');
      //throw new Error()
      response = null;
  }
  console.log('message buffer: ', message.toString('hex'))
  console.log('response: ', response)
  return response
}

function processMessage(message,rcon) {
  if (message.length >= 4 && (message.readUInt8(0) == 0x88 || (message.readUInt8(0) == 0x80) || (message.readUInt8(0) == 0x3f) || (message.readUInt8(0) == 0x7f) || (message.readUInt8(0) == 0x77)) ) {
    return processCFRAME(message,rcon);
  } else {
    console.log('msg:', message.toString('hex'), (message.readUInt8(0) == 0x3f))
    console.error('Mensaje no reconocido o inválido');
    //throw new Error('Mensaje no reconocido o inválido')
    return null;
  }
}

server.on('message', (msg, rinfo) => {
  console.log(`Mensaje recibido: ${rinfo.address}:${rinfo.port}`);

  // Procesar el mensaje recibido
  const response = processMessage(msg, rinfo);

  if (response) {
    // Enviar la respuesta al cliente
    server.send(response, rinfo.port, rinfo.address, (err) => {
      if (err) {
        console.error(`Error al enviar la respuesta: ${err.message}`);
      } else {
        console.log(`Respuesta enviada: ${rinfo.address}:${rinfo.port}`);
      }
      console.log(`------FIN DEL MENSAJE------`);
    });
  } else {
    console.log('No se envió respuesta: mensaje no procesado', response);
    console.log(`------FIN DEL MENSAJE------`);
  }

});

server.on('listening', () => {
  const address = server.address();
  console.log(`Servidor UDP escuchando en ${address.address}:${address.port}`);
  console.log(`------INICIO DE LA ESCUCHA------`);

});

server.on('error', (err) => {
  console.error(`Error en el servidor: ${err.message}`);
  server.close();
});

// Configuración del servidor
const PORT = 8844;
const HOST = '0.0.0.0';
server.bind(PORT, HOST);
}catch(err){
  console.error(new Error(err.stack))
  throw new Error(err)
}


