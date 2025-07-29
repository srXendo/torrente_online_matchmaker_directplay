const c_entity = require('./entity');
const { parentPort } = require('worker_threads');
const https = require('https');

const MAX_TRYS = 3; // Solo 2 intentos antes de aplicar la eliminación casi inmediata
const MAX_WAIT_RESPONSE = 2000; // Espera máxima para recibir respuesta (2s)

module.exports = class cache_manager {
    entities = {};
    refresh = false;
    #server;

    constructor(server) {
        this.#server = server;
    }

    async send_tick_to_address_port(address, port) {
        this.entity_try_update(address, port);

        const payload = Buffer.from('000231f2011242191fb8bb154e4401763631007932', 'hex');
        const trys = this.entity_get_trys(address, port);
        const responseKey = `${address}:${port}`;
        let responded = false;

        const responseHandler = (msg, rinfo) => {
            if (rinfo.address === address && rinfo.port === Number(port)) {
                responded = true;
            }
        };

        this.#server.on('message', responseHandler);

        await new Promise((resolve) => {
            this.#server.send(payload, port, address, (err) => {
                if (err) {
                    console.error(`❌ No se pudo enviar paquete a ${address}:${port}`);
                    resolve();
                    return;
                }
                setTimeout(resolve, MAX_WAIT_RESPONSE);
            });
        });

        this.#server.off('message', responseHandler);

        if (!responded) {
            console.warn(`🚫 Sin respuesta de ${address}:${port} — eliminando`);
            this.delete_entity(address, port);
            parentPort.postMessage(`DELETE---${address}---${port}`);
            return false;
        }

        console.log(`✅ ${address}:${port} respondió correctamente`);
        return true;
    }

    send_update_tick() {
        return Promise.all(this.get_arr_entities().map(e => this.send_tick_to_address_port(e.address, e.port)));
    }

    entity_get_trys(address, port) {
        return this.entities[address]?.[port]?.entity_get_trys() || 0;
    }

    entity_get_refresh(address, port) {
        return this.entities[address]?.[port]?.entity_get_refresh() || null;
    }

    entity_try_update(address, port) {
        return this.entities[address]?.[port]?.entity_try_update() || false;
    }

    entity_update(address, port) {
        return this.entities[address]?.[port]?.update_refresh() || false;
    }

    is_refresh() {
        return this.refresh;
    }

    set_refresh(isRefresh) {
        this.refresh = isRefresh;
    }

    add_entity(address, port) {
        if (!this.entities[address]) this.entities[address] = {};

        if (!this.entities[address][port]) {
            console.log(`✔️ Añadiendo entidad nueva: ${address}:${port}`);
            this.entities[address][port] = new c_entity(address, port);
        } else {
            console.log(`🧩 La entidad ya existe: ${address}:${port}`);
        }
    }

    get_parties() {
        return this.entities;
    }

    get_arr_entities() {
        const result = [];
        for (const ip in this.entities) {
            for (const port in this.entities[ip]) {
                const entity = this.entities[ip][port];
                if (entity) result.push(entity);
            }
        }
        return result;
    }

    delete_entity(address, port) {
        if (!this.entities[address]?.[port]) {
            console.error(new Error(`No existe la entidad: ${address}:${port}`));
            return false;
        }

        delete this.entities[address][port];

        if (Object.keys(this.entities[address]).length === 0) {
            delete this.entities[address];
        }

        console.log(`🗑 Entidad eliminada: ${address}:${port}`);
        return true;
    }
};
