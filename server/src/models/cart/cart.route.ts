import { Router } from "express";
import { redis, redisPub, redisSub } from "../../config/db";
import CartModel from "./cart.model";
import { Utils, CartUtils } from "../../config/utils";
import ROSListener from "./ros";
import CameraSubManager from "../../config/camera-subs";

const vehicleRouter = Router();

// This is a test
vehicleRouter.get("/test-camera/:name", async (req, res) => {
  clearInterval(interval);
  interval = setInterval(() => {
    counter = (counter + 1) % images.length;
    const img = images[counter];
    CameraSubManager.emitFrame(req.params.name, img);
  }, 1000);

  res.status(200).json({ message: "Emitting camera frame every 1 second." });
});

// Retrieve list of all currently registered carts
vehicleRouter.get("/", async (req, res) => {
  let keys = await redis.keys("vehicle:*");
  if (keys.length === 0) {
    res.send([]);
    return;
  }

  // We need to JSON.parse() each cart property
  const vehicles = await Promise.all(
    keys.map(async (key) => {
      try {
        const data = await redis.hGetAll(key);

        const parsedData = Utils.parseData(data);

        return { ...parsedData };
      } catch (err) {
        console.log(err.message);
      }
    })
  );

  res.json(vehicles);
});

// Retrieve cart by its name
vehicleRouter.get("/:name/", async (req, res) => {
  const item = await redis.hGetAll(`vehicle:${req.params.name}`);

  if (!item || Object.keys(item).length === 0) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  res.json(item);
});

// Create new cart, using `name` as the key
vehicleRouter.post("/", async (req, res) => {
  const result = await CartUtils.updateCart(req.body.name, req.body);

  res.json({ ...result });
});

// Update a cart given its name
vehicleRouter.put("/:name/", async (req, res) => {
  const result = CartUtils.updateCart(req.params.name, req.body);

  res.json(result);
});

// Create a ROSListener given a cart's ROS IP and listen for topics
vehicleRouter.post("/register/", async (req, res) => {
  const url = req.body?.url;
  const name = req.body?.name;

  if (!url || !name) {
    res.status(400).json({ error: "Name and URL are required" });
    return;
  }

  if (!redis.exists(`vehicle:${name}`)) {
    await CartUtils.updateCart(name, { name: name });
    const rosListener = new ROSListener(url, name);
  } else {
    ROSListener.listeners[name] = new ROSListener(url, name);
  }

  res.json({ name, url });
});

// ALL TESTING STUFF
let interval = null;
let counter = 0;
const images = [
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADvklEQVQ4Tw3TizfVBwDA8e+Pm+a1GbXb0ehuuSrNiu4yTXnNWB7tVFpSmcXizrMmGhnVseumszpIHsszyutQkslKIlusJcPOMGLoYLK1Hmb81r/wOecjGLxnJDpe0UWnTEXo3kF8bmZxR7zG06KnfBoXxPhEKZvESyi3lhNo/xbSOiW7vaKw3LOf9f09CE5irCie2EKkBKSeF0jadxrjoUscnCjn8E47LEQHuscXMxU2wSc5tljFqvg5eRSv6EMUqAYQzNvcxAdXi1Cr76P67iHPtf4k7JCUmKYMzqTHI2cVWnfLqAqq51BUMZKdMhbr2rE4N4WoCAcEWf8j0T6pi41NIl3LfKm27mOz7zPiU3fR8+ZWYtR5/KHpj9FzZ27aXODq80yUlpf48HQyJbUzCPsX3RC9Tb9Aa9lDPHd8zZnBYoz6z6GwycdhZQmT8abUTuwkzcqa9HPdJJpP8ZqqHNdbjwn9QYZgENwndh6U0+Nmw+ZpM1oCZ2k6201LnDU3dnzGZb1VDEjUaGZvoCFBQvguP+YTj1CdH8uqkl4Em4ZFoqPvMI1PJpHWnKQ02gmHAD9yXIbIf6eZkft5DKi2U/xGF+dzf6HimRfb//qR92X+fK7diHCgqFVUyMMxz7pOoPcRBqumuBg0jklLGu33HLCfuMzj5QkM7RlmRdoWgu4loThezgb3LcxGmyIU/mMhvjJXieKDAdoKgvGv/4iKllNUyrdRsjwbi0h9GtyrSNKNItzFgrpIKQOdRty+Zka7mSNCw+owcTQikVyNV7HT+5iQ0gzURlkE9ewg1eN1mn5fwa3hdRxbE8zVnBqiZK2s7JESHzrGiSYfhDKNYFFLvgDXKEtylmxguLGFMRMvVkT3oXAfoy3iFIf9l2JiU8iMYg+ZHW/j/ESHYD8XbKuzETQFD1HLcBsjtusISG/jVmA3egWr6dXuYPhuBMbtbqi/naLKU4J27L/Izi7homsHbpTy/WwJQknlbTEm2559iit4a4wwvymLY/mVxAbMMy2ZZG9zM/+traY5xJjek44kVLjjpLJi9fpvUOqmIZjezhbv3NfgvM5LvNyqh/KoFQfqy4gwDyH+p+s4W/jRtbYNcx1v5n4bxdAzDWufafRT9HlQWfMCcftGUSXMESQ1IcMgmd0pa3hX8OCaeikL9SpwELyRZN4gxdEWzQUiX+l1MzyjgcHuL6nzWYjgHzgmdo42oltYi3+5kr/zXoyriSP1VzmyoxdwFGYxvDyHvFIkqXgRSmsdih61s7IXInxG+B+WIIPgrmJn8wAAAABJRU5ErkJggg==",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADwElEQVQ4TwXBC1SNBwDA8f9XpJZL2W2XIxVWMl1Grei5zFTqYuU65WbkSttZih5Dm1PRlkjrpWYVq9OxcXtsJ3o4hFZLJUevJYszlYrkJuGoy7ffT5hqmSNWBZQT5P0O++o61JoIep86cvZeFoNiAzb2P/N0mpQ0x3NcrfqHuKYiimwdkHmmUfTQEOHO5SuijbCKLzpCKdwYycz+bBbf9ifawZTXDQu5lJuKKtQO5fexeL99Q+WLmYTe6OSRyUzcK6QIX6/OFnuMp3M9uIPPPleyzCUTgweHqJWNUl9mjldjBM12GiTydUj0PJj157fc7CtG/qiAst/uI5z4slG89ImcJo82no81oAnQkmHljFVCHs/rnLl9L4ADo/osHU8jrTAE25Mr8da2klG4nFaL7QizF9SId3M86B5qJiNKQdKJZtb/bUuDKortF4pI3RzONR9bcuOTyYztQXu3jT3+nVReCaahJhhhY8gC8dQrHffq23Hqd0JvUkJ0yDuGfRQkxh6kL0iPfUmOVNw5wgrZLaxfBWLsV8WWwbX09FsjONStERNKnZBKe0gxVGGS6km17Bj13btISDjM42md3E8/zb7jp4gLOcD5GBVjhrkoTxpw+1keQqk6WVQ397FieiIzHusTZlPCztV76RmfR8GMAjyfH6N86QZOhvWRdyOFiYWL8Gx/jeq/anR7byLUfxUm5u6PxGtrA67nLdjmqEdvioBl21XW+S4hyOUnMrVHqHu5lQvvJbMjfJy3mnDs0gOxqT+EEGr6qdh7LpCjaxV8XDiFR+QqmtqCyP9oN4rhNEomF/HkZT4Zy9yZf0zHsH0KB+daE26uIv5pC0Kq5LKoVxHGVPR3+Kb78oufjN1nT/Di4igO+yewGDDklXEj1/P0abEMoNjoGosjPZCbVtAuLUZwTbYVa7encsZNSn7ZTXRaM3Jci1EGavGK2cmEzI+YAgsGVXcYajPh4eRG/E0WslS+DVXhRQSDJ0rRzSmd2KFnyOKrSTb7F4NpXqQWH8a2qxz9qdMoc37lzJIkOiwfIFEoMa74g9q+zdxSDyA0CjrRek8Wvj/M4r7/GPt040TWFKFrkzAvzIAX5st5P2IXBpY1+FTFMa/fhpIdg8xxW0JlXg5C5ZytYlxoF63yTWxI6+ZH5Rri171hmSYJbdVR5o98QOyoHXPrz2HkEs/ZLDXf5M/GecIKhbsfwoihRPQxMYKR9Yjq42g2hTPQUcp4VzxdvztzpPU8f2U7kqh4hLt8ETvMosjcMsTmvDKkH67kf4afiIScQ0caAAAAAElFTkSuQmCC",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADvElEQVQ4TwXBCzSVBwDA8f/ntWyYsXVspXHrRLR5THmW16KV1ey40ZFXedxNa1Lrhi6FyPPgUHqocyWrYXeEsDGP8lpzvFJKLXvIqdA5OJmpb7+fIBsrFi+djyVbOUKq0Q36tOW4PItFXfIBxVtsmOtYwMu6HHfxAmeT6+ktD2ZU4cOhc9V8KD+FsGF7ldipl0iv7yjKB64Mrk+nZWsg+9Y+5DenZ2yO3MZHVko8FsvYmKeBndo4B9sLUN2rJWdDFELN3+Niyj8DZMp28+h3CUe1vHE9po7UVY3Of09TvDIR+4RGLOt0UYvxR0elx4uqbTxc8qVsfQPCtM7P4lKyI+2KLH5QFBE8X8HzuQxc3AZQz9bh9GwMNw4FcvVMKVmv96LmWc9MYDvhhWtIqNdDOFQ5JLpr2tL1KIupeD90qiJI1JikwGIFGgmWxB/ej7ZXMa0928l/NYeYE0xRvMjjX3zJaHiKoP2wRLyU4YpWqYBupTm1Nu8QZxDFy6An1NnFUpm7n0ULLdoeuFGtn8JsvsAdaSyaX1txsWAdwtqpM6Kx/QJ9te74e13mZLIEG2sH4syS8Sjso2elDgsdMLvrNldU23jrbDQususE2I+wc6U9gmXFuNh/25kki8dcCBtAM7KZ4zNK0mT5GHgaYGJiTPTz5ZjbxGCm1ozt9jCmv63iuMKY78+3IOytDxT3m75H6qsJ7M+o+KZmkLa0PSQYbaXqUhzDoyqyLXvwSQ1DcreLTmNDlgKlKAfsKPlTH0FPUigWZEbRLf8Jh/FVbOqRYrAkQZGUSbjGJ6gytHny6xG6w08QviOE5paDmM4Vc25dHicqUhCcFvNEj97T7JIuUhT6CO/GVIbHjAg/thvtxAmWRSv5L8CYktAkJlYd4F7mLeYvThDrps2+IycR7qtqxbiQWzwumySiU8YOa2caqsNgapgX3uWkta7iu5cFXHCZ5doeMzoG/8IgJxzDFan4mz5HcFhwFE0UU0QuOZF6eDlzOZvokksY2uhJ+eeO3NdLIygnEIeIfkLm7lA34kPl+w28mu6h309EuBk7Jg69OYBkxhzjj9u5776FvKYczJ828ofjIAe+8kF//jNkGjHkqt7A/VMZVZ15XJtcTZHVAwQLW6VYc90L1ZgTO7ub+EJ6GR27EhSvpUxn1VNg2ITh1R9J13dlbLM+Bko587pBLC2T0mCajnC0bVJsDZXhXdKNX3M3ZblXuFtihkzegDxynLwxGwJsnRkp9ebmlzGov2tIf/oMuWuKmX17Nf8Ddq2MmVG7FvkAAAAASUVORK5CYII=",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADw0lEQVQ4Tw3QjTvUBwDA8e+PLteeiUZl0lC6smbd8/RiJa03epFGYdVkybyummy10cw9qVTethWt09KDosvLIUTMtdbjoeFWu9Kbmlvd0FSO5h7xW//B5/kIWpm3WPmBgQ7dAcyMATgtM/B+ahgO407x9bq53LO8QujO3azzGKJac5WC9jjUPnF47Fby6cJpCBbBdmJQ/nwmLWtFMZhMiuEiSokCa7fnRKf0MjpzmGbVAwyXFOhEI91WByk6aktaQw+SgQMISrs00RRowYWmXPaknadZ549cGcjdvkiCvmhmQomBeUHd6H1fMrnFmTmJMna9rKc6/yLWR7wQ6iyTxLLhaDxuvKI0K5kiu295rN/L85NyJIo+cj8a4tazn7lpUYrF0n7SH/rSdjIdZc8PeLbUI6gWxohPrufxYtNb7Bzvyda1g6w1bsE2vZDODSJat1x6W9qZnrGfAUGPj+kkEd/bYdlnQ8VqDYJt6G2xZF4fbiNlXFuZTVPvdNbLnYmPnsL5zAmUKfNw/z2Y8rAxdCpk5B6+SrEmlDatH5vvmiFs3BUrDmVuZmiRBzG6RBraj3M81cipwGKM/xTSsDuAxtg1BC/IR1uxjSjDIIpZsxFn3+N0SyrCkpIKsejNDM72xnDQsx1FgUBoaTqN1VJGk81JVB0j4au9mMtUmHnl0TqSi+/0SYSt1THnVSdCdrdEVDl0Ye3dyoFrW3gnPIdPLscy1B+BTPBhQUgB1/1CyArvYMlr0XveNVS6f46qw5F9kiMIPf7h4rzPviRngxsuY51Zen8VLsMZnCiXsG34DisaPwSvsYxfsZAxPnWo29yZdX8GDtmTmT/3J4T9TwVxolbFo4bt3PHP4lJ0I2b3nnCiqpm6B49RS/dyerWcaUd2svxsO5r0WDJd6/H+OIWpSX8iGM7UilGuhbw4Y0Nc6rskVx1jlW0rtX5y/DwL+GuxiRThHKN264n4zURmUgrKNTlYnzuNk2Migv3Ew+LtNaUo735HV8kfGMVaVmZ7YmPaSs2m/dg7NjOz3Jl18h24xe9j6vJy9ryoQHY5gim3nBBCutWis0yN1GUKLkdvUvTGdhLsn/Kr1go/zWQ0i9IwZNTi+uNFopQPib5QRFbXDMKqljGu3w7hlN4kDuTcoFK9AKtD99E/C2TklxGiqtz5BiUbY+r5Ny+T4LQA4puLsX57B9pDCdy20hH5yPz1gVeeKHUKoE46yI0rSxjsrCTVqGdxTQC7/ltFpLQJ36F47P0TCTsRxd8eDTj42+Be7UBbfT//A3tOmBzdm7MDAAAAAElFTkSuQmCC",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADwElEQVQ4Tw3TjTPWBwDA8e8PUw3VHuOoZ14ysTTLUQ0PQ3k5nnhqzwyly7xcTNJFkSXtSld6MoosiYwzZDbXkJdmPBZN3lIbtV5Oo8JN16PQ6rd9/oePYP79aVFWkkRc8nEize8Q6eNIQn0/5xLzUGoXUDWfwOi2EHSbdpMXo2RuoJqiQ9Z4x0s5FXoR4eGUuTj5hz8789pR+4XhaVTHyYvaKArD+b30RzbrRHHGK5PWkClsc3dxVv8dOi8VU5v+Ewa9MQgeRe6i5LUuy8ueUFwg40LHZ4xW6dDcbE/Fwse8mBB53+Yled1hhK6U4Zowg+J5G7/p6SMJ6EGoPPhITLaQ0jjfhVPXl+wZcuZ59l1UV8NZb7sIld7faOy1iX28CVmxNUOKHlJ26mKqm0jd9AcI+/70ESX6N/HOSiRwwx7WOe3l6lg6Z9fcwHSuDk3TVi47biLTKBNJZDHLZDf4ZGgaaXYTh9ICEHpuTItNmyax/SaawpIBTPSsyXczJnwunfes1lI/JjJleA/DYCU3U89zZf15DFatYco1FJV6N0JMs49opchFmmJKS/88jZOdtKxqx3x7Odd9MmgOc8JZnULU1jZOBIkoWpciXWnB7OtgTnu/QrgQOCgOvzBk3CaX5oZ8FpVfJ7w8n7wFloxpX2Nrog6m0X245aSjqk/AtLOZ73rrMchvQ7KlEGG4qkHM3tXBV0VJ1Kx14Yj1UnzTdhCg28f+28fwW3ecwzPW+H50hgcZasp2ODL5Jp4W4UPOFWQhLGs3E+V35YQXCFzTKsXA+GsOzGxAHXiFzQ+sMHebRKJyI3B/BV4dXTwZPEPqwh30BriQU3IXoeSvo+KvcWF8nGxHUewocpmcKZULY5rl5LSvZUPQEswcXjCekcwrqSVy5VOMtsxinqVkRW4JQr4yWhT1D2C8+hcuJ0VTXFvG4iwDHD9dgst9gYT+XibsIvAKbuG+jjaerj+wsU1AEjKC2qgLoWNWI3YblPOy4w5HnOWoisbpXKPk4MMTSP1EYswGOPo0CsuRXhqSHhGka4HJ0RyG376Fx5wvQlelWqx9dou0uGl8Y7uoDiihZt8BWmUaerT/xe7wBW639jFfGoz/m0pOZbYQElvLt4IS27o0hBWvx0Wn/4P0RuhQM7mae8EnKeh0p9DEDMWzY1Q/cKBdE4FidCn7EzQss/dhrvsLBt+1Z+PPTQhaqdvFbZ6d/ONRgWu8FnXpvkwsKMfS+QnJQf6kXFJyyN+dt+T+1H9+hMakcGz0HBipXsLivZb8Bxe5hUJl29O2AAAAAElFTkSuQmCC",
];

export default vehicleRouter;
