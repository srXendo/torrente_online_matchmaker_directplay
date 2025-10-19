module.exports = class Party {
    ip;
    port;
    payload;
    refreshDate;
    detail = null;

    constructor(ip, port, payload) {
        this.ip = ip;
        this.port = port;
        this.payload = payload;
        this.refreshDate = new Date();
    }

    /**
     * Actualiza los datos de la partida a partir de un payload en formato hexadecimal
     */
    update_data_party(hexPayload) {
        this.refreshDate = Date.now();
        const bufferPayloadDetail = Buffer.from(hexPayload, 'hex');

        const extractedDetail = this.extract_data(bufferPayloadDetail);
        if (!extractedDetail) {
            console.warn('⚠️ No se pudieron extraer detalles del payload.');
            return;
        }

        this.detail = extractedDetail;

        if (this.payload && this.detail) {
            const updatedPayload = this.set_detail_data(
                this.payload,
                this.detail.currentPlayers,
                this.detail.maxPlayers,
                this.detail.mapName
            );
            if (updatedPayload) {
                this.payload = updatedPayload;
            }
            console.log('Detalles extraídos:', this.detail);
        }
    }

    /**
     * Extrae datos de jugadores y nombre del mapa
     */
    extract_data(buffer) {
        let offsetByte = buffer.readUInt8(4);
        let nameStartIdx = 0;

        // Ajuste de offset si hay separadores especiales
        if (buffer.readUInt8(offsetByte + 1) !== 0x00 && buffer.readUInt8(offsetByte + 2) === 0x00) {
            offsetByte += 2;
        }

        // Busca el inicio del nombre de la sala
        for (let i = offsetByte + 1; i < buffer.length; i++) {
            const byte = buffer.readUInt8(i);
            if (byte > 0x20 && byte < 0x7E && byte !== 0x00) {
                nameStartIdx = i;
                break;
            }
        }

        const currentPlayers = buffer.readUInt8(nameStartIdx - 2);
        const maxPlayers = buffer.readUInt8(nameStartIdx - 1);

        // Detectar nombre de mapa desde "MP_"
        const mapSignature = Buffer.from('4d505f', 'hex');
        const mapOffset = buffer.indexOf(mapSignature);
        let mapName = null;

        if (mapOffset !== -1) {
            const chars = [];
            for (let i = mapOffset; i < buffer.length; i++) {
                const byte = buffer[i];
                if (byte === 0x00 || byte < 0x20 || byte > 0x7E) break;
                chars.push(String.fromCharCode(byte));
            }
            const nameCandidate = chars.join('');
            if (nameCandidate.startsWith('MP_')) {
                mapName = nameCandidate;
            } else {
                console.warn('⚠️ Nombre de mapa inválido:', nameCandidate);
            }
        } else {
            console.warn('⚠️ No se encontró la firma "MP_" en el buffer');
        }

        //console.log('Encontrado nombre idx:', nameStartIdx, currentPlayers, maxPlayers, mapName);

        return {
            currentPlayers,
            maxPlayers,
            mapName,
        };
    }

    /**
     * Escribe los jugadores actuales, máximos y el nombre del mapa en el buffer de payload
     */
    set_detail_data(buffer, currentPlayers, maxPlayers, mapName) {
        const copy = Buffer.from(buffer);
        const portOffsetStart = 72;
        let portOffsetEnd = -1;

        // Buscar el final del puerto en el payload
        for (let i = portOffsetStart; i < portOffsetStart + 3; i++) {
            if (copy[i] === 0x00) {
                portOffsetEnd = i;
                break;
            }
        }

        if (portOffsetEnd < 0) {
            console.error('Puerto no encontrado en el buffer:', copy.toString('hex'));
            return false;
        }

        let offsetByte = portOffsetEnd;
        let nameStartIdx = 0;

        // Ajuste de offset si hay separadores especiales
        if (copy.readUInt8(offsetByte + 1) !== 0x00 && copy.readUInt8(offsetByte + 2) === 0x00) {
            offsetByte += 2;
        }

        // Buscar inicio del nombre de la sala
        for (let i = offsetByte + 1; i < copy.length; i++) {
            const byte = copy.readUInt8(i);
            if (byte > 0x20 && byte < 0x7E && byte !== 0x00) {
                nameStartIdx = i;
                break;
            }
        }

        // Escribir jugadores actuales y máximos en el buffer
        copy.writeUInt8(currentPlayers, nameStartIdx - 2);
        copy.writeUInt8(maxPlayers, nameStartIdx - 1);

        // Actualiza nombre de mapa si está disponible
        if (mapName) {
            const mapSignature = Buffer.from('4d505f', 'hex');
            const mapOffset = copy.indexOf(mapSignature);
            if (mapOffset !== -1) {
                const mapBytes = Buffer.from(mapName, 'ascii');
                mapBytes.copy(copy, mapOffset);
                if (mapBytes.length < 20) {
                    copy.fill(0x00, mapOffset + mapBytes.length, mapOffset + 20);

                    if (mapName.startsWith('MP_DMT')) copy.writeUInt8(0x03, mapOffset - 1);
                    else if (mapName.startsWith('MP_DM')) copy.writeUInt8(0x00, mapOffset - 1);
                    else if (mapName.startsWith('MP_B')) copy.writeUInt8(0x01, mapOffset - 1);
                    else if (mapName.startsWith('MP_DO')) copy.writeUInt8(0x02, mapOffset - 1);
                }
            }
        }

        return copy;
    }
};
