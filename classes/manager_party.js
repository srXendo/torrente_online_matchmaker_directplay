
const cParty = require('./party')
const { Worker } = require('worker_threads');
const path = require('path');


module.exports = class manager_party{
    members = {}
    #worker = null;
    #interv = null;
    constructor(){
        this.init_update_thread()
    }
    add_member(ip, port, payload, refresh){
        if(!this.members[ip]){
            this.members[ip] = {}
        }
        if(!this.members[ip][port]){
            this.members[ip][port] = {}
            
        }
        this.members[ip][port] = new cParty(ip, port, payload, refresh)
        this.#worker.postMessage(`${ip}---${port}`);
    }
    get_parties(){
        return this.members
    }
    get_arr_parties(){
        const partys = this.get_parties()
        const response = []
        for(let ip in partys){
            for(let port in partys[ip]){
                response.push(partys[ip][port])
            }
        }
        return response
    }
    get_arr_payload(msg1, msg2, msg3){
        let response = [],
        limit    = 256;
        const arr_parties = this.get_arr_parties()
        for(let idx in arr_parties){
            console.log("--party", arr_parties[idx], arr_parties[idx] && arr_parties[idx].payload)
        
            let party = arr_parties[idx].payload
            const i = parseInt(idx)
            party.writeUint8(msg1, 1)
            party.writeUint8(msg2 + i, 2)
            party.writeUint8(msg3 , 3)
            party.writeUint8(0x00, 4)
            if(party[2] <= limit){
                response.push(party)
                
            }else{
                console.warn('no se pueden enviar mas partidas')
            }
         
        }
        return response      
    }
    get_arr_ip_ports(){
    const partys = this.get_parties()
        const response = []
        for(let ip in partys){
            for(let port in partys[ip]){
                response.push({ip, port})
            }
        }
        return response
    }
    init_update_thread(){
        console.log('inicio el thread')
        this.#worker = new Worker(path.resolve(__dirname, '../libs/helper.js'));

        this.#worker.on('message', (msg) => this.process_msg_worker(msg));

        this.#worker.on('error', (err) => {
            console.error('Error en el worker:', err);
            clearInterval(this.#interv)
        });

        this.#worker.on('exit', (code) => {
            console.log('Worker finalizado con código:', code);
            clearInterval(this.#interv)
        });
        
    }
    process_msg_worker(msg){
        const arr_msg = msg.split("---")
        const address = arr_msg[1]
        const port = arr_msg[2]
        switch(arr_msg[0]){
            case 'DELETE':
                    console.error('party afk durante mucho tiempo ', address, port)
                    this.delete_party(address, port)
                break;
            case 'UPDATE':
                    const hex_payload = arr_msg[3]
                    console.log('nuevos detalles por setear: ', address, port)
                    this.update_party(address, port, hex_payload)
                break;    
        }

      
    }
    update_party(address, port, hex_payload){
        if(!this.members[address]){
            console.warn(`ip no partida: ${address}: ${port}`)
            return false
        }
        if(!this.members[address][port]){
            console.warn(`ippuerto no partida: ${address}: ${port}`)
            return false
        }

        this.members[address][port].update_data_party(hex_payload)
    }
    delete_party(address, port){
        if(!this.members[address]){
            console.error(new Error(`No existe la entidad con ip y puerto:\n${address}:${port}`))
            return false
        }
        if(!this.members[address][port]){
            console.error(new Error(`No existe la entidad con ip y puerto:\n${address}:${port}`))
            return false
        }
        delete this.members[address][port];
        if(Object.keys(this.members[address]).length === 0){
            delete this.members[address];
        }
        console.log(`Partida eliminada: ${address}:${port}`)
    }
}