const c_entity = require('./entity');
const { parentPort } = require('worker_threads');
const MAX_TRYS = 7 * 8;
const REFRESH_EXPIRATION = 1000 * 60 * 2; // 2 minutos
const https = require('https');

module.exports = class cache_manager {
    entities = {};
    refresh = false;
    #server;

    constructor(server) {
        this.#server = server;
    }

    async send_tick_to_address_port(address, port) {
        this.entity_try_update(address, port);

        const lastRefresh = this.entity_get_refresh(address, port);
        const trys = this.entity_get_trys(address, port);
        const now = Date.now();

        console.log(`Entidad: ${address}:${port} | trys=${trys} | lastRefresh=${lastRefresh ? new Date(lastRefresh).toISOString() : 'n/a'} | diff=${lastRefresh ? now - lastRefresh : 'n/a'}ms`);

        // Si no hay fecha de actualización, forzamos la eliminación
        if (!lastRefresh) {
            console.warn(`lastRefresh vacío para ${address}:${port} — eliminando por seguridad`);
            this.delete_entity(address, port);
            parentPort.postMessage(`DELETE---${address}---${port}`);
            return false;
        }

        // Si venció el tiempo y se superó el límite de intentos, eliminamos
        if ((now - lastRefresh) > REFRESH_EXPIRATION || trys > MAX_TRYS) {
            console.warn(`Eliminando ${address}:${port} — inactivo por ${now - lastRefresh}ms, trys=${trys}`);
            this.delete_entity(address, port);
            parentPort.postMessage(`DELETE---${address}---${port}`);
            return false;
        }

        // Si está todo bien, enviamos el paquete UDP de ping
        const payload = Buffer.from('000231f2011242191fb8bb154e4401763631007932', 'hex');

        return new Promise((resolve) => {
            this.#server.send(payload, port, address, (err) => {
                if (err) {
                    console.error(new Error(`Error enviando paquete a ${address}:${port}: ${err.message}`));
                    return resolve(false);
                }
                resolve(true);
            });
        });
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
            console.log(`Añadiendo entidad nueva: ${address}:${port}`);
            this.entities[address][port] = new c_entity(address, port);
        } else {
            console.log(`Ya existe: ${address}:${port}`);
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
