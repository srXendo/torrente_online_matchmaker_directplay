const c_entity = require('./entity')
const { parentPort } = require('worker_threads');
const trys_delete_entity = 7 * 8
const expires_refresh = 1000 * 60 * 2
const https = require('https');

module.exports = class cache_manager{
    entities = {}
    refresh = false
    #server;
    constructor(server){
        this.#server = server;
    }
    send_tick_to_address_port(address, port){
        this.entity_try_update(address, port)
        console.log('intento refrescar la entidad')
        return new Promise(async(resolve, reject)=>{
            if(!this.entity_get_refresh(address, port)){
                resolve(false)
            }else{
                if(new Date().getTime() - this.entity_get_refresh(address, port) < expires_refresh && this.entity_get_trys(address, port) <= trys_delete_entity){

                    this.#server.send(Buffer.from('000231f2011242191fb8bb154e4401763631007932', 'hex'), port, address, (err)=>{
                        if(err){
                            console.error(new Error(err))
                            resolve(false)
                        }
                        resolve(true)
                    })

                }else if(this.entity_get_trys(address, port) > trys_delete_entity){
                    //envia señal para borrar esta entidad
                    this.delete_entity(address, port)
                    parentPort.postMessage(`${'DELETE'}---${address}---${port}`);
                    resolve(false)
                }else{
                    resolve(false)
                }
            }
        })
    }
    send_update_tick(){
        
        const arr_entities = this.get_arr_entities()
        return Promise.all(arr_entities.map((obj, i)=>this.send_tick_to_address_port(obj.address, obj.port)))
    }
    
    entity_get_trys(address, port){
        if(!this.entities[address]){
            return false
        }
        if(!this.entities[address][port]){
            return false
        }
        return this.entities[address][port].entity_get_trys()
    }
    entity_get_refresh(address, port){
        if(!this.entities[address]){
            return false
        }
        if(!this.entities[address][port]){
            return false
        }
        return this.entities[address][port].entity_get_refresh()
    }
    entity_try_update(address, port){
        if(!this.entities[address]){
            return false
        }
        if(!this.entities[address][port]){
            return false
        }
        this.entities[address][port].entity_try_update()
    }     
    entity_update(address, port){
        if(!this.entities[address]){
            return false
        }
        if(!this.entities[address][port]){
            return false
        }
        this.entities[address][port].update_refresh()
    }
    is_refresh(){
        return this.refresh
    }
    set_refresh(is_refresh){
            this.refresh = is_refresh;
    }
    add_entity(address, port){
        if(!this.entities[address]){
            this.entities[address] = {}
        }
        if(!this.entities[address][port]){
            this.entities[address][port] = new c_entity(address, port)
        }
    }
    get_parties(){
        return this.entities
    }
    get_arr_entities(){
        const entities = this.get_parties()
        const response = []
        for(let ip in entities){
            for(let port in entities[ip]){
                if(entities[ip][port]) {
                    response.push(entities[ip][port]);
                }
            }
        }
        return response
    }
    delete_entity(address, port){
        if(!this.entities[address]){
            console.error(new Error(`No existe la entidad con ip y puerto:\n${address}:${port}`))
            return false
        }
        if(!this.entities[address][port]){
            console.error(new Error(`No existe la entidad con ip y puerto:\n${address}:${port}`))
            return false
        }
        delete this.entities[address][port];
        if(Object.keys(this.entities[address]).length === 0){
            delete this.entities[address];
        }
        console.log(`entidad eliminada eliminada: ${address}:${port}`)
        return 
    }
}