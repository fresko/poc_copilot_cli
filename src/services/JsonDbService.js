const fs = require('fs').promises;
const path = require('path');

class JsonDbService {
    constructor(filename) {
        this.filePath = path.join(__dirname, '../../data', filename);
        this.init();
    }

    async init() {
        try {
            await fs.mkdir(path.dirname(this.filePath), { recursive: true });
            try {
                await fs.access(this.filePath);
            } catch {
                await fs.writeFile(this.filePath, '[]', 'utf8');
            }
        } catch (err) {
            console.error(`Error initializing DB for ${this.filePath}:`, err);
        }
    }

    async getAll() {
        try {
            const data = await fs.readFile(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            return [];
        }
    }

    async save(items) {
        await fs.writeFile(this.filePath, JSON.stringify(items, null, 2), 'utf8');
    }

    async add(item) {
        const items = await this.getAll();
        items.push(item);
        await this.save(items);
        return item;
    }

    async update(idField, idValue, updates) {
        const items = await this.getAll();
        const index = items.findIndex(i => i[idField] === idValue);
        if (index !== -1) {
            items[index] = { ...items[index], ...updates };
            await this.save(items);
            return items[index];
        }
        return null;
    }
    
    async find(predicate) {
        const items = await this.getAll();
        return items.find(predicate);
    }

    async delete(idField, idValue) {
        const items = await this.getAll();
        const filtered = items.filter(i => i[idField] !== idValue);
        await this.save(filtered);
        return true;
    }
}

module.exports = JsonDbService;
