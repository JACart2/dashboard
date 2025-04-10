// This syntax is awful - look into schema tools such as Zod
const CartModel = Object.freeze({
  name: null as string,
  speed: null as number,
  tripProgress: null as number,
  longLat: null as number[],
  startLocation: null as string,
  endLocation: null as string,
});

export default CartModel;
