export namespace Utils {
  export function stringifyModel(model: any, data: any) {
    const rawData = {};
    const stringifiedData = {};

    Object.entries(data).forEach(([key, value]: [string, any]) => {
      if (key in model) {
        rawData[key] = JSON.stringify(value);
        stringifiedData[key] = value;
      }
    });

    return {
      object: rawData,
      stringified: stringifiedData,
    };
  }

  export function parseData(data: any) {
    const parsedData = {};

    Object.entries(data).forEach(([key, value]: [string, any]) => {
      parsedData[key] = JSON.parse(value);
    });

    return parsedData;
  }
}
