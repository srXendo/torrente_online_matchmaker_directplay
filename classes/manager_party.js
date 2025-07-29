const cParty = require('./party');
const { Worker } = require('worker_threads');
const path = require('path');

module.exports = class ManagerParty {
    members = {};
    #worker = null;

    constructor() {
        this.#initUpdateThread();
    }

    add_member(ip, port, payload, refresh = false) {
        if (!this.members[ip]) {
            this.members[ip] = {};
        }
        const portStr = String(port);
        if (this.members[ip][portStr]) {
            if (refresh && payload) {
                this.members[ip][portStr].payload = payload;
                console.log(`🔄 Partida actualizado ${ip}:${portStr}`);
            }
            return;
        }
        this.members[ip][portStr] = new cParty(ip, portStr, payload, refresh);
        console.log(`🟢 Partida añadida: ${ip}:${portStr}`);
        if (this.#worker) {
            this.#worker.postMessage(`${ip}---${portStr}`);
        }
    }
    
    update_party(ip, port, hex_payload) {
        const party = this.members?.[ip]?.[port];
        if (!party) {
            console.warn(`⚠️ Partida no encontrada para actualizar: ${ip}:${port}`);
            return;
        }
        party.update_data_party(hex_payload);
    }

    delete_party(ip, port) {
        if (!this.members?.[ip]?.[port]) {
            console.warn(`⚠️ No existe la partida para eliminar: ${ip}:${port}`);
            return;
        }

        delete this.members[ip][port];

        if (Object.keys(this.members[ip]).length === 0) {
            delete this.members[ip];
        }

        console.log(`❌ Partida eliminada: ${ip}:${port}`);
    }

    get_parties() {
        return this.members;
    }

    get_arr_parties() {
        return Object.entries(this.members).flatMap(([ip, ports]) =>
            Object.values(ports)
        );
    }

    get_arr_payload(msg1, msg2, msg3) {
        const response = [];
        const limit = 256;
        const arr_parties = this.get_arr_parties();

        for (let i = 0; i < arr_parties.length; i++) {
            const party = arr_parties[i].payload;

            if (!party) {
                console.warn(`⚠️ Partida inválida en índice ${i}`);
                continue;
            }

            party.writeUInt8(msg1, 1);
            party.writeUInt8(msg2 + i, 2);
            party.writeUInt8(msg3, 3);
            party.writeUInt8(0x00, 4);

            if (party[2] <= limit) {
                response.push(party);
            } else {
                console.warn('🚫 Límite de partidas alcanzado, omitiendo...');
            }
        }

        return response;
    }

    get_arr_ip_ports() {
        const result = [];
        for (const [ip, ports] of Object.entries(this.members)) {
            for (const port of Object.keys(ports)) {
                result.push({ ip, port });
            }
        }
        return result;
    }

    #initUpdateThread() {
        console.log('⚙️ Iniciando worker de actualización...');
        this.#worker = new Worker(path.resolve(__dirname, '../libs/helper.js'));

        this.#worker.on('message', (msg) => this.#processMsgWorker(msg));
        this.#worker.on('error', (err) => {
            console.error('❌ Error en el worker:', err);
        });
        this.#worker.on('exit', (code) => {
            console.warn(`⚠️ Worker finalizado con código: ${code}`);
        });
    }

    #processMsgWorker(msg) {
        const [action, address, port, payload] = msg.split('---');

        switch (action) {
            case 'DELETE':
                console.warn(`🗑 Eliminando partida inactiva: ${address}:${port}`);
                this.delete_party(address, port);
                break;

            case 'UPDATE':
                console.log(`🔁 Actualizando partida desde worker: ${address}:${port}`);
                this.update_party(address, port, payload);
                break;

            default:
                console.warn(`❓ Mensaje desconocido desde el worker: ${msg}`);
        }
    }
};
