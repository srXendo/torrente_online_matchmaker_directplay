module.exports = class entity{
    trys = 0;
    refresh = new Date().getTime()
    address = null;
    port = null
    constructor(address, port){
        this.address = address
        this.port = port
    }
    update_refresh(){
        this.trys = 0
        this.refresh = new Date().getTime() 
    }
    entity_get_trys(){
        return this.trys
    }
    entity_try_update(){
        this.trys++
    }
    entity_get_refresh(){
        return this.refresh
    }
}