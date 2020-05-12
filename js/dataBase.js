

//DATA BASE FUNCTIONS FOR LECTURES
var dataBase = {
    db: null,

    init: function () {
        try {
            //CREATE TABLES
            dataBase.db = openDatabase('incidencies', '1.0', 'Incidencies DB', 10 * 1024 * 1024);
            dataBase.createTables();
            return true;
        } catch (e) {
            if (bitgrup.production) {
                $('#title-page-error').html('Aquest dispositiu no es compatible amb l\'app, disculpi les molèsties.');
                bitgrup.changePage('noCompatible');
                bitgrup.initScreen();
                return false;
            }
        }
    },

    createTables: function () {
        //CREATE TABLE STATUS
        dataBase.query('CREATE TABLE IF NOT EXISTS STATUS (ID unique, FK_ENTITY, MIGRATED)');
        //CREATE TABLE ISSUES
        dataBase.query('CREATE TABLE IF NOT EXISTS ISSUES (ID unique, FK_ENTITY, TYPE, DESCRIPTION, DATE, HOUR, STATUS, LATITUDE, LONGITUDE, ADDRESS, ADDRESS_AUX, LOCATION, FEEDBACK)');
        //CREATE TABLE PICTURES
        dataBase.query('CREATE TABLE IF NOT EXISTS PICTURES (ID unique, FK_ENTITY, BASE_64)');
        dataBase.query('ALTER TABLE PICTURES ADD FK_ENTITY INT');
        //CREATE TALBE CONFIG
        dataBase.query('CREATE TABLE IF NOT EXISTS CONFIG (ID unique, ENTITY_ID, EMAIL, DEVICE_ID)', null, function (result) {
            dataBase.configInit();
        });
        dataBase.query('ALTER TABLE CONFIG ADD DEVICE_ID');

    },

    configInit: function () {
        dataBase.query('SELECT * FROM CONFIG WHERE ID = ? ', [1], function (result) {
            if (result.length === 0) {
                //INSERT
                dataBase.query('INSERT INTO CONFIG (ID) VALUES(?)', [1], function () {
                    //INICIAM API (COMUNICACIÓ AMB TIC)
                    api.init();
                });
            } else {
                api.init();
            }
        });
    },

    query: function (sql, inputs, callback) {
        try {
            if (!inputs) {
                inputs = new Array();
            }
            var result = new Array();
            dataBase.db.transaction(function (tx) {
                tx.executeSql(sql, inputs,
                        function (tx, result_query) {
                            var len = result_query.rows.length;
                            for (var i = 0; i < len; i++) {
                                result.push(result_query.rows.item(i));
                            }
                            if (callback) {
                                callback(result);
                            }
                        },
                        function (transaction, error) {
                            if(!error.message.includes('duplicate column name')) {
                                api.sendSuggestion('ERROR-DB-49: ' + sql + ' ---- ' + error.message);
                                //bitgrup.error_('ERROR-DB-49', '', sql + '----' + error.message);
                                console.log(sql, inputs, error);
                            }
                            callback(false);
                        }
                );

            });
        } catch (e) {
            console.log(sql, inputs, e);
            callback(false);
        }
    }

}

