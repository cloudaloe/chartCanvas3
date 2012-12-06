describe("mysql database", function() {
  var player;
  var song;

  it("should be able to be connectable", function() {
    expect(testMysqlDB()).toEqual(null);
  });
  
});