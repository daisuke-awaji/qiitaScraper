const main = require("./puppeteer");

jest.setTimeout(1000000);
test("ye", async done => {
  await main();
  done();
});
