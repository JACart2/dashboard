const API_ROOT = import.meta.env.VITE_API_ROOT;

export const vehicleService = {
  BASE_URL: API_ROOT + "vehicles",

  async getVehicles() {
    const data = await fetch(this.BASE_URL, { method: "GET" });
    return data.json();
  },

  getVehicle(id: number) {
    return fetch(this.BASE_URL + id, { method: "GET" });
  },
};
