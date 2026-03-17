const JsonDbService = require('./JsonDbService');
const crypto = require('crypto');

const vehicleDb = new JsonDbService('Vehicle.json');
const customerDb = new JsonDbService('Customer.json');
const reservationDb = new JsonDbService('Reservation.json');

class ValetService {
    static async createReservation(data) {
        // 1. Save/Update Customer
        const existingCustomer = await customerDb.find(c => c.mobile_number === data.customer.mobile_number);
        if (!existingCustomer) {
            await customerDb.add(data.customer);
        }

        // 2. Save/Update Vehicle
        const existingVehicle = await vehicleDb.find(v => v.license_plate === data.vehicle.license_plate);
        if (!existingVehicle) {
            await vehicleDb.add(data.vehicle);
        }

        // 3. Create Reservation
        const reservation = {
            reservation_id: data.reservation_id || crypto.randomUUID(),
            ...data,
            status: data.status || 'active',
            check_in_time: data.check_in_time || new Date().toISOString(),
            check_out_time: null,
            parking_duration: null
        };
        
        await reservationDb.add(reservation);
        return reservation;
    }

    static async getReservations() {
        return await reservationDb.getAll();
    }

    static async updateReservation(id, updates) {
        return await reservationDb.update('reservation_id', id, updates);
    }
    
    static async deleteReservation(id) {
         return await reservationDb.delete('reservation_id', id);
    }

    static async getVehicles() {
        return await vehicleDb.getAll();
    }

    static async getCustomers() {
        return await customerDb.getAll();
    }
}

module.exports = ValetService;
