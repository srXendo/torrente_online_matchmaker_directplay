module.exports = class party {
    ip;
    port;
    payload;
    refresh_date;
    detail = null
    constructor(ip, port, payload){
        this.ip = ip
        this.port = port
        this.payload = payload
        this.refresh_date = new Date()
    }
    update_data_party(hex_payload){
        this.refresh_date = new Date().getTime()
        const buff_payload_detail = Buffer.from(hex_payload, 'hex')
        this.detail = this.extract_data(buff_payload_detail)
        if(this && this.payload){
            const port = this.set_detal_data(this.payload, this.detail.currentPlayers, this.detail.maxPlayers)
            if(port){
                this.payload = port
            }
            console.log('detalles extraidos: ', this.detail)
        }
    }
    extract_data(buffer) {
        let offset_byte = buffer.readUInt8(4)
        let idx = 0
        if(buffer.readUInt8(offset_byte+1) !== 0x00 && buffer.readUInt8(offset_byte+2) === 0x00  ){
            offset_byte = offset_byte + 2
        }
        for(let i = offset_byte+1;  i < buffer.length; i++){
            if((buffer.readUInt8(i) > 0x20 && buffer.readUInt8(i) < 0x7E) && buffer.readUInt8(i) !== 0x00){
                idx = i
                break;
            }
        }
        const actual_players = buffer.readUInt8(idx-2)
        const max_players = buffer.readUInt8(idx-1)
        console.log('encontrado nombre idx',  idx, actual_players, max_players)
        return {
          currentPlayers: actual_players,
          maxPlayers: max_players
        };
       

    }
    set_detal_data(buffer, cPlayers, mPlayers){
        const portOffsetStart = 72 
        let portOffsetEnd = -1;
        for(let i = portOffsetStart; i < portOffsetStart + 3; i++){
            portOffsetEnd = i
            if(buffer[i] === 0x00 ){
                break;  
            }
            
        }
        if(portOffsetEnd < 0){
            console.error('puerto no encontrado para datos de partida: ', buffer.toString('hex'))
            return false
        }
       
        let offset_byte = portOffsetEnd
        let idx = 0
        if(buffer.readUInt8(offset_byte+1) !== 0x00 && buffer.readUInt8(offset_byte+2) === 0x00  ){
            offset_byte = offset_byte + 2
        }
        for(let i = offset_byte+1;  i < buffer.length; i++){
            if((buffer.readUInt8(i) > 0x20 && buffer.readUInt8(i) < 0x7E) && buffer.readUInt8(i) !== 0x00){
                idx = i
                break;
            }
        }
        buffer.writeUInt8(cPlayers, idx-2);
        buffer.writeUInt8(mPlayers, idx-1);

        return buffer

    }
}