const app = require("./app");
require("dotenv").config();



(async () => {
    try {
        console.log("Database connected successfully");

        app.listen(process.env.PORT, () => {
            console.log("Server is running...");
        });
    } catch (error) {
        console.error("Failed to connect to DB:", error);
    }
})();

