// JavaScript Document


var api = {

    url: 'https://issueapp.ticmallorca.net/rest/',
    password: 'h^t2N6$ZtI5&T1xjxxv2uGZ7&wQT^aJW7CO329nBPbLHpSPj0U4FaEEG&wqqOtX9z@I2z*xP#5gQEQgIhVCv7p9o&XrV0e2YNbt',
    deviceId: null,
    token: null,
    entity: null,
    issuesLimit: 100,

    init: function () {
        try {
            if (bitgrup.production) {
                api.deviceId = device.uuid;
                if (api.deviceId) {
                    api.getConfig();
                } else {
                    bitgrup.log('ERROR API-TEC 20: No tenemos deviceId');
                    api.errorApi(21);
                }
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

    setToken: function (token) {
        api.token = token;
    },

    access: function (callback) {
        bitgrup.log('TOKEN INIT 48 ');
        var today = new Date();
        var year = today.getFullYear();
        var month = today.getMonth() + 1;
        var day = today.getDate();
        var hours = today.getHours();
        var date = year.toString() + month.toString() + day.toString() + '.' + hours.toString();
        var phrase = date + api.password + api.deviceId;
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
        //bitgrup.changePage('noCompatible');
    },

    /*########################################################################
     #######################    ISSUES    ####################################
     ########################################################################*/

    getIssues: function (callback) {
        try {
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

    /*#######################    SEND    ##################################*/


    send: function (data, type, uri, callback) {
        var statusSpinner = bitgrup.spinner.status;
        var json = JSON.stringify(data);

        if (type === 'GET') {
            $.ajax({
                type: type,
                url: api.url + uri + '?' + data,
                dataType: "json",
                //async: false,
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
                        bitgrup.log('apitic 221', resposta);
                    }
                    callback(resposta);
                },
                error: function (e) {
                    console.log('apitic 226', e);
                    callback(0);
                },
                timeout: 3000
            });
        } else {
            $.ajax({
                type: type,
                url: api.url + uri,
                data: json,
                dataType: "json",
                contentType: "application/json; charset=utf-8",
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
                },
                timeout: 3000
            });
        }

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


