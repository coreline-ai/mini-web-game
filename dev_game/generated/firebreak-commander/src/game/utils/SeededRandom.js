export default class SeededRandom {
  constructor(seed = 1) {
    this.state = (Number(seed) >>> 0) || 1;
  }

  nextUint() {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }

  next() {
    return this.nextUint() / 0x100000000;
  }

  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  clone() {
    return new SeededRandom(this.state);
  }
}
