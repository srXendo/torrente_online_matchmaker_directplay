const https = require('https');

const AUX_HEX = "3F00030200113235352E3235352E3235352E323535000000000000000000000000000000000000000000000000000000248268772019470300005C0088E035030000000000000000B82200000010506344654D657361000000000000A013787878787878787878787878787878787878787878009013620000005C00000000002482687700E1350300005C000000000000000000201947030000000000A619002DA324966400000019000000505B6A002C82020890810208E8A519001C5B6A0080811580000000001C5B6A00185B6A000000000004A6190004A619001BD5D4551C5B6A00A0D7D207E0C8D455000000001CA619001FC9D455BC31D25538A7190048A6190058A61900D4AE19002D80D55558533F03BC31D25538A7190048A6190058A619000000000001000000EA82D55500000000C2030000B822000058533F03000000000100000000E1350348E73F034CE73F0304000000000000000200004D505F444D5F5645525449474F0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000806141E1E02FFFF000000000000";

function replaceBinaryIp(buffer, newIpStr, newPort) {
  const byte_separate = 0x11;
  const offset_start_ip = buffer.indexOf(byte_separate) + 1;
  let offset_end_ip = offset_start_ip;

  while (offset_end_ip < buffer.length && buffer[offset_end_ip] !== 0x00) {
    offset_end_ip++;
  }

  const originalIp = buffer.slice(offset_start_ip, offset_end_ip);
  let paddedNewIp = newIpStr.padEnd(originalIp.length, '\x00');
  const ipBytes = Buffer.from(paddedNewIp, "ascii");

  const first_part = buffer.slice(0, offset_start_ip);
  const last_part = buffer.slice(offset_end_ip);

  const updated = Buffer.concat([first_part, ipBytes, last_part]);
  if (newPort) {
    const portIdx = updated.indexOf(Buffer.from([0xB8, 0x22]));
    if (portIdx !== -1) {
      updated.writeUInt16LE(parseInt(newPort), portIdx);
    }
  }

  return updated;
}

function reemplazarNombreMapa(buffer, nombreActual, nombreNuevo) {
  const originalBytes = Buffer.from(nombreActual, 'ascii');
  const nuevoBytes = Buffer.from(nombreNuevo, 'ascii');
  const offset = buffer.indexOf(originalBytes);
  if (offset === -1) return buffer;

  const nuevoBuffer = Buffer.from(buffer);
  nuevoBytes.copy(nuevoBuffer, offset);
  if (nuevoBytes.length < originalBytes.length) {
    nuevoBuffer.fill(0x00, offset + nuevoBytes.length, offset + originalBytes.length);
  }
  return nuevoBuffer;
}

function replaceGameName(buffer, newName) {
  const NAME_OFFSET = buffer.indexOf(Buffer.from('a013', 'hex')) + 2;
  const NAME_LENGTH = 24;
  const nameBuffer = Buffer.alloc(NAME_LENGTH, 0x00);
  nameBuffer.write(newName.slice(0, NAME_LENGTH), 'ascii');
  nameBuffer.copy(buffer, NAME_OFFSET);
  return buffer;
}

function obtenerPartidasDesdeWeb(manager_party) {
  const url = 'https://www.gunner.es/Game/sala/default.asp';

  https.get(url, (res) => {
    let html = '';
    res.on('data', chunk => html += chunk);
    res.on('end', () => {
      const filas = html.match(/<tr><td[^>]*>.*?<\/tr>/gs) || [];
      let nuevas = 0;

      for (const fila of filas) {
        const columnas = [...fila.matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map(m => m[1].trim());

        if (columnas.length >= 4 && !columnas[0].includes('Nombre Sala')) {
          let nombreSala = columnas[0].replace(/<[^>]+>/g, '').trim();
          const modalidadMatch = columnas[1].match(/>([^<]+)<\/a>/);
          const modalidad = modalidadMatch ? modalidadMatch[1] : columnas[1].replace(/<[^>]+>/g, '').trim();
          let ip = columnas[2].replace(/<[^>]+>/g, '').trim();
          const puerto = columnas[3].replace(/<[^>]+>/g, '').trim();

          if (ip === 'gunner.es') ip = '90.77.110.65';

          let template = Buffer.from(AUX_HEX, 'hex');
          template = replaceBinaryIp(template, ip, puerto);
          template = reemplazarNombreMapa(template, 'MP_DM_VERTIGO', modalidad);
          template = replaceGameName(template, nombreSala);

          manager_party.add_member(ip, puerto, template, true);
          nuevas++;
        }
      }

      console.log(`🔁 [\x1b[31mGUNNER\x1b[0m] Actualización completada. Partidas nuevas: ${nuevas}`);
    });
  }).on('error', (err) => {
    console.error('❌ [\x1b[31mGUNNER\x1b[0m] Error al obtener datos:', err.message);
  });
}

module.exports = {
  obtenerPartidasDesdeWeb,
};
