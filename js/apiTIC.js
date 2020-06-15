var api = {

    url: 'https://issueapp.ticmallorca.net/rest/',
    crp: 'U2FsdGVkX1819EPP2GTpgJnW8al5o50QmtCWP1LWqBxqChyaOJtO2cVZS55chJwywBJXi9beWXEJBcNkaRS3I3B9Ui0gwIXqRWF/MR7GUrY0G7FPlcGNYUn96KHJfPw2gM2+Mf/mDgn5HE1BeqP+aNLwDudK/45JqD1UD9DC/48=',
    deviceId: null,
    token: null,
    entity: null,
    issuesLimit: 100,

    init: function () {
        try {
            if (bitgrup.production) {

                api.getDeviceID(function (id) {
                    if (id) {
                        api.deviceId = id;
                    } else {
                        api.setDeviceID(device.uuid, function () {
                            api.deviceId = device.uuid;
                        });
                    }

                    if (api.deviceId) {
                        api.getConfig();
                    } else {
                        bitgrup.log('ERROR API-TEC 20: No tenemos deviceId');
                        api.errorApi(21);
                    }
                });


            } else {
                api.deviceId = '8b0e32cf46fcfb14';
                api.getConfig();
            }
        } catch (e) {
            api.errorApi(28);
        }
        //bitgrup.entities.chooseEntity();
    },

    /*########################################################################
     #######################   AUTH    ######################################
     ########################################################################*/
    getConfig: function () {
        dataBase.query('SELECT * FROM CONFIG WHERE ID = ? ', [1], function (result) {
            bitgrup.entities.setConfig(result[0]);
        });
    },

    getDeviceID: function (callback) {
        dataBase.query('SELECT DEVICE_ID FROM CONFIG WHERE ID = ? ', [1], function (result) {
            if (result[0].DEVICE_ID) {
                callback(result[0].DEVICE_ID);
            } else {
                callback(null);
            }
        });
    },

    setDeviceID: function (id, callback) {
        dataBase.query('UPDATE CONFIG SET DEVICE_ID = ?', id);
        callback();
    },

    setToken: function (token) {
        api.token = token;
    },

    access: function (callback) {
        bitgrup.log('TOKEN INIT 48 ');
        if (api.deviceId) {
            var dcp = CryptoJS.AES.decrypt(api.crp, "bitgrup");
            var phrase = dcp.toString(CryptoJS.enc.Utf8) + api.deviceId;
        }
        var sha512 = new Hashes.SHA512;
        // DEVICEDT de TEST
        //var deviceDT = {platform: 'Android', version: '5.1.1', manufacturer: 'samsung', network: 'wifi'};
        if (bitgrup.production) {
            var deviceDT = {platform: device.platform, version: device.platform, manufacturer: device.manufacturer, network: bitgrup.getConnection()};
        } else {
            var deviceDT = {platform: 'Desktop', version: 'test', manufacturer: 'test', network: 'wifi'};
        }
        var data = {phrase: sha512.hex(phrase), instance: api.deviceId, device: deviceDT};
        try {
            api.send(data, 'POST', 'access', function (token) {
                bitgrup.log('TOKEN API TIC 66 ', token);
                if (token.token) {
                    api.setToken(token);
                    callback(token.token);
                } else {
                    callback(false);
                }

            });
        } catch (e) {
            bitgrup.log('TOKEN API TIC 76: TOKEN UNDEFINED ');
            bitgrup.log('TOKEN API TIC 76: data ', data);
            callback(false);
        }

    },

    errorApi: function (linia) {
        bitgrup.spinner.force(0);
        bitgrup.spinner.off();
        //bitgrup.initScreen();
        bitgrup.alert('E-' + linia + ': No s\ha pogut connectar amb el servidor, prova més tart.');
        $('#loading button').show();
        //bitgrup.changePage('noCompatible');
    },

    /*########################################################################
     #######################    ISSUES    ####################################
     ########################################################################*/

    getIssues: function (callback) {
        try {
            document.getElementById('issuesMap').style.pointerEvents = 'none';
            api.access(function (token) {
                var data = 'token=' + token + '&' + 'entityId=' + bitgrup.config.ENTITY_ID + '&' + 'limit=' + api.issuesLimit;
                var resp = api.send(data, 'GET', 'issue', function (resp) {
                    //Actualitzam l'estat de totes les incidencies a la BBDD
                    if (resp.status) {
                        bitgrup.issues.list.updateIssues(resp.data, function () {
                            callback();
                        });
                    } else {
                        callback();
                    }
                });

            });
        } catch (e) {
            bitgrup.log('apitic 112', e);
            api.errorApi(113);
            return false;
        }
    },

    getIssue: function (id, callback) {
        var data = 'token=' + api.token + '&' + 'id=' + id;
        api.send(data, 'GET', 'issue/id', function (resp) {
            callback(resp);
        });
    },

    sendIssue: function (id, issueDt, callback) {
        try {
            api.access(function (token) {
                var data = {token: token, entityId: parseInt(id), issue: issueDt};
                api.sendAjaxIssue(data, 'issue', function (resp) {
                    try {
                        if (resp.data[0].status == 1) {
                            callback(resp.data[0].id);
                        } else {
                            callback(0);
                        }
                    } catch (e) {
                        bitgrup.log('E-API-92', e);
                        callback(0);
                    }
                });

            });
        } catch (e) {
            bitgrup.log('apiTic 147', e);
            api.errorApi(147);
            api.sendSuggestion("ERROR APP: " + e, null);
            return false;
        }
    },

    getImgsIssue: function (issue) {
        var imgs = new Array();
        $(issue.IMGS).each(function (i) {
            var img = issue.IMGS[i];
            imgs.push({name: api.deviceId + '_' + issue.ID + '_i', format: 'base64', height: 0, width: 0, data: img});
        });
        return imgs;
    },

    /*########################################################################
     #######################    ENTITIES    ##################################
     ########################################################################*/


    getEntities: function (callback) {
        try {
            api.access(function (token) {
                if (token) {
                    var data = 'token=' + token;
                    api.send(data, 'GET', 'entity', function (entities) {
                        bitgrup.log('APITIC 166 ENTITIES ', entities);
                        callback(entities.data);
                    });
                } else {
                    callback(false);
                }
            });
        } catch (e) {
            bitgrup.log('APITIC 175 ', e);
            callback(false);
        }
    },

    getEntity: function (entityId, callback) {
        try {
            api.access(function (token) {
                var data = 'token=' + token + '&' + 'entityId=' + entityId;
                api.send(data, 'GET', 'config', function (resp) {
                    api.entity = resp;
                    callback(api.entity.data);
                });
            });
        } catch (e) {
            bitgrup.log('api tic 190', e);
            api.errorApi(190);
            return false;
        }
    },

    /*########################################################################
     #######################    SUGGESTION    ################################
     ########################################################################*/

    sendSuggestion: function (suggestion, callback) {
        try {
            api.access(function (token) {
                var data = {token: token, suggestion: suggestion};
                try {
                    api.sendAjaxSuggestion(data, 'suggestion', function (resp) {
                        callback(resp.message);
                    });
                } catch (e) {
                    callback("Ha ocorregut un error, intenta-ho una altra vegada.");
                }
            });
        } catch (e) {
            bitgrup.log('API TIC 192', e);
            api.errorApi(192);
        }
    },

    /*########################################################################
     #######################    MIGRATE DB    ################################
     ########################################################################*/

    migrateDB: function (callback) {
        dataBase.query('SELECT * FROM STATUS WHERE FK_ENTITY = ?', [bitgrup.config.ENTITY_ID], function (result) {
            if (result.length === 0 || !result[0].MIGRATED) {
                //Borrar les incidencies de la BBDD local
                dataBase.query('DELETE FROM ISSUES WHERE FK_ENTITY = ?', [bitgrup.config.ENTITY_ID], function () {
                    dataBase.query('DELETE FROM PICTURES WHERE FK_ENTITY = ?', [bitgrup.config.ENTITY_ID], function () {
                        //Recuperar el llistat d'incidències
                        api.access(function (token) {
                            var data = 'token=' + token + '&' + 'entityId=' + bitgrup.config.ENTITY_ID + '&' + 'limit=' + api.issuesLimit;
                            var resp = api.send(data, 'GET', 'issue', function (resp) {
                                if (resp.size > 0) {
                                    $(resp.data).each(function (i) {
                                        var issue = resp.data[i];
                                        var dades = [issue.issueId, parseInt(bitgrup.config.ENTITY_ID), issue.status, issue.description];
                                        dataBase.query('INSERT INTO ISSUES (ID, FK_ENTITY, STATUS, FEEDBACK) VALUES (?, ?, ?, ?)', dades, function () {
                                            var data = 'token=' + token + '&' + 'entityId=' + bitgrup.config.ENTITY_ID;
                                            var resp = api.send(data, 'GET', 'issue/' + issue.issueId, function (resp) {
                                                $(resp.data).each(function (i) {
                                                    var details = resp.data[i];
                                                    var d = new Date(details.origin['created'] * 1000);
                                                    var day = ("0" + d.getDate()).slice(-2);
                                                    var month = ("0" + (d.getMonth() + 1)).slice(-2);
                                                    var year = d.getFullYear();
                                                    var date = day + '/' + month + '/' + year;
                                                    var hours = ("0" + d.getHours()).slice(-2);
                                                    var minutes = ("0" + d.getMinutes()).slice(-2);
                                                    var seconds = ("0" + d.getSeconds()).slice(-2);
                                                    var hour = hours + ':' + minutes + ':' + seconds;
                                                    var dada = [details.origin['category'], details.origin['description'], date, hour, details.origin['location'].latitude, details.origin['location'].longitude, details.origin['address'], issue.issueId];
                                                    dataBase.query('UPDATE ISSUES SET TYPE = ?, DESCRIPTION = ?, DATE = ?, HOUR = ?, LATITUDE = ?, LONGITUDE = ?, ADDRESS_AUX = ? WHERE ID = ?', dada, function () {
                                                        $(details.origin['image']).each(function (i) {
                                                            var image = details.origin['image'][i];
                                                            var d = [image.name, issue.issueId, bitgrup.config.ENTITY_ID, image.data];
                                                            dataBase.query('INSERT INTO PICTURES (ID, FK_ISSUE, FK_ENTITY, BASE_64) VALUES (?,?,?,?)', d, null);
                                                        });
                                                    });
                                                    bitgrup.issues.list.setList();
                                                });
                                            });
                                        });
                                    });
                                }
                            });
                        });
                    });
                });
                dataBase.query('INSERT INTO STATUS (FK_ENTITY, MIGRATED) VALUES(?, 1)', [bitgrup.config.ENTITY_ID], null);
            }
        });
        callback();
    },

    /*#######################    SEND    ##################################*/


    send: function (data, type, uri, callback) {
        var statusSpinner = bitgrup.spinner.status;
        var json = JSON.stringify(data);

        if (type === 'GET') {
            $.ajax({
                url: api.url + uri + '?' + data, timeout: 3000, type: 'GET', cache: false, contentType: "application/json; charset=utf-8", processData: false, async: true,
                beforeSend: function () {
                    if (!statusSpinner) {
                        bitgrup.spinner.on();
                    }
                },
                complete: function () {
                    if (!statusSpinner) {
                        bitgrup.spinner.off();
                    }
                },
                success: function (resposta) {
                    if (bitgrup.production == 0) {
                        console.log('apitic 250', resposta);
                    }
                    callback(resposta);
                },
                error: function (e) {
                    bitgrup.log('apitic 255', e);
                    callback(0);
                }
            });
        } else {
            $.ajax({
                url: api.url + uri, timeout: 3000, type: 'POST', data: json, cache: false, contentType: "application/json; charset=utf-8", processData: false, async: true,
                beforeSend: function () {
                    if (!statusSpinner) {
                        bitgrup.spinner.on();
                    }
                },
                complete: function () {
                    if (!statusSpinner) {
                        bitgrup.spinner.off();
                    }
                },
                success: function (resposta) {
                    if (bitgrup.production == 0) {
                        console.log('apitic 250', resposta);
                    }
                    callback(resposta);
                },
                error: function (e) {
                    bitgrup.log('apitic 255', e);
                    callback(0);
                }
            });
        }


    },

    sendAjaxSuggestion: function (data, uri, callback) {
        var json = JSON.stringify({suggestion: data.suggestion});
        $.ajax({
            type: 'POST',
            url: api.url + uri + '?token=' + data.token,
            data: json,
            dataType: "json",
            async: false,
            contentType: "application/json; charset=utf-8",
            beforeSend: function () {
                bitgrup.spinner.on();
            },
            complete: function () {
                bitgrup.spinner.off();
            },
            success: function (resposta) {
                bitgrup.log('RESP SUGGESTION: ', resposta);
                callback(resposta);
            },
            error: function (e) {
                bitgrup.log('apitic 285', e);
                callback(0);
            },
            timeout: 3000
        });
    },

    sendAjaxIssue: function (data, uri, callback) {
        var json = JSON.stringify({issue: data.issue});
        $.ajax({
            type: 'POST',
            url: api.url + uri + '?token=' + data.token + '&entityId=' + data.entityId,
            data: json,
            dataType: "json",
            async: false,
            contentType: "application/json; charset=utf-8",
            beforeSend: function () {
                bitgrup.spinner.on();
            },
            complete: function () {
                bitgrup.spinner.off();
            },
            success: function (resposta) {
                bitgrup.log('RESP NEW ISSUE: ', resposta);
                callback(resposta);
            },
            error: function (e) {
                bitgrup.log('apitic 284', e);
                callback(0);
            },
            timeout: 3000
        });
    }

}
