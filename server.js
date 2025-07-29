const app = require("./app");
require("dotenv").config();

const sequelize = require("./config/database");

(async () => {
    try {
        await sequelize.sync();
        app.listen(process.env.PORT, () => {
            console.log("server is running...")
        });
    } catch (error) {
        console.error('Failed to connect to DB:', error);
    }
})();
