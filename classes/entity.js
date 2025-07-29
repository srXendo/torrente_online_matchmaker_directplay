module.exports = class Entity {
    #trys = 0;
    #refresh = Date.now();
    address;
    port;

    constructor(address, port) {
        this.address = address;
        this.port = port;
    }

    update_refresh() {
        this.#trys = 0;
        this.#refresh = Date.now();
    }

    entity_try_update() {
        this.#trys++;
    }

    entity_get_trys() {
        return this.#trys;
    }

    entity_get_refresh() {
        return this.#refresh;
    }
}
