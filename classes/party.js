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

        this.detail = this.extract_data(bufferPayloadDetail);

        if (this.payload && this.detail) {
            const updatedPayload = this.set_detail_data(this.payload, this.detail.currentPlayers, this.detail.maxPlayers);
            if (updatedPayload) {
                this.payload = updatedPayload;
            }
            console.log('Detalles extraídos:', this.detail);
        }
    }

    /**
     * Extrae el número de jugadores actuales y máximos desde el buffer
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

        console.log('Encontrado nombre idx:', nameStartIdx, currentPlayers, maxPlayers);

        return {
            currentPlayers,
            maxPlayers
        };
    }

    /**
     * Escribe los jugadores actuales y máximos en el buffer de payload
     */
    set_detail_data(buffer, currentPlayers, maxPlayers) {
        const portOffsetStart = 72;
        let portOffsetEnd = -1;

        // Buscar el final del puerto en el payload
        for (let i = portOffsetStart; i < portOffsetStart + 3; i++) {
            if (buffer[i] === 0x00) {
                portOffsetEnd = i;
                break;
            }
        }

        if (portOffsetEnd < 0) {
            console.error('Puerto no encontrado en el buffer:', buffer.toString('hex'));
            return false;
        }

        let offsetByte = portOffsetEnd;
        let nameStartIdx = 0;

        // Ajuste de offset si hay separadores especiales
        if (buffer.readUInt8(offsetByte + 1) !== 0x00 && buffer.readUInt8(offsetByte + 2) === 0x00) {
            offsetByte += 2;
        }

        // Buscar inicio del nombre de la sala
        for (let i = offsetByte + 1; i < buffer.length; i++) {
            const byte = buffer.readUInt8(i);
            if (byte > 0x20 && byte < 0x7E && byte !== 0x00) {
                nameStartIdx = i;
                break;
            }
        }

        // Escribir jugadores actuales y máximos en el buffer
        buffer.writeUInt8(currentPlayers, nameStartIdx - 2);
        buffer.writeUInt8(maxPlayers, nameStartIdx - 1);

        return buffer;
    }
};
