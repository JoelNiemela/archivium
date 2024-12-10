function deepCompare(a, b) {
    if (!(a instanceof Object && b instanceof Object)) {
      return a === b;
    }
    for (const key in a) {
      if (!deepCompare(a[key], b[key])) return false;
    }
    return true;
  }
