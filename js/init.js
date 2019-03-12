// JavaScript Document


var bitgrup = {

    lang: 'ca',
    config: null,
    production: 1, 

    /* ###########################################################################*/
    /* ################             INIT          ################################*/
    /* ###########################################################################*/

    initApp: function () {
        //ESPERAM A FINALITZAR INIT
        bitgrup.spinner.on();


        //INCLUDES:
        bitgrup.includes();

        //TORNADA ENRERA
        $(".pagina").on("swiperight", function () {
            if (!$(this).hasClass('pinch-zoom-container') || !$('#oncpd-html').hasClass('zoom')) {
                window.history.back();
            }
        });

        //NOTIFICACIONS
        try {
            //bitgrup.initPushNotification();
        } catch (e) {
            bitgrup.log('E INIT-95 INIT PUSH NOTIFICATION');
        }

        //CARREGAR PAGINES EXTERNES
        $(document).bind("mobileinit", function () {
            $.support.cors = true;
            $.mobile.allowCrossDomainPages = true;
        });

        //ISSUES
        bitgrup.issues.init();
        //NEWS
        bitgrup.news.init();

        //DATA BASE
        dataBase.init();
    },

    /* ###########################################################################*/
    /* #################         CONFIG / ENTITIES          #####################*/
    /* ###########################################################################*/

    entities: {

        entity: null,
        category: null,

        setConfig: function (config) {
            bitgrup.config = config;
            //SI TENIM ENTITAT LA CARREGAM
            try {
                if (config.ENTITY_ID) {
                    //CRIDAM PER RETORN DE LA INFORMACIÓ DE L'ENTITY
                    api.getEntity(parseInt(config.ENTITY_ID), function (entity) {
                        if (entity[0].id) {
                            bitgrup.entities.setEntityScreen(entity[0]);
                        } else {
                            //TORNAM A DEMANAR ENTITAT
                            bitgrup.entities.chooseEntity();
                        }
                    });
                    //
                } else {
                    //GET TOTES LES LES ENTIDATS PER TRIAR
                    bitgrup.log('CHOOSE ENTITY'); 
                    bitgrup.entities.chooseEntity();
                }
            } catch (e) {
                //bitgrup.log(e);
                bitgrup.entities.chooseEntity();
            }
        },
        
        tryChoose: 0,

        chooseEntity: function () {
            bitgrup.entities.tryChoose++;
            api.getEntities(function (entities) {
                if(entities){
                    var html = '';
                    $(entities).each(function (i) {
                        var entity = entities[i];
                        html = html + '<button class="btn" onclick="bitgrup.entities.setEntity(\'' + entity.id + '\')">' + entity.name + ' </button>';
                    });
                    $('#entities-list').html(html);
                    //TOT APUNT
                    bitgrup.initScreen();
                }else{
                    if(bitgrup.entities.tryChoose < 4){
                        setTimeout('bitgrup.entities.chooseEntity();',500);
                    }else{
                        bitgrup.log('init ERROR 104: NO TENIM TOKEN');
                        api.errorApi(104);
                    }
                }
            });
        },

        setEntity: function (entity_ID) {
            api.getEntity(entity_ID, function (entity) {
                bitgrup.entities.entity = entity;
                try{
                    if (entity[0].id) {
                        dataBase.query('UPDATE CONFIG SET ENTITY_ID = ? ', [entity[0].id]);
                        bitgrup.config.ENTITY_ID = entity_ID;
                        bitgrup.entities.setEntityScreen(entity[0]);
                    } else {
                        bitgrup.entities.error();
                    }
                }catch(e){
                    bitgrup.entities.error();
                }
            });
        },

        setEntityScreen: function (entity) {
            //logo
            if (entity.image.data) {
                $('#logo-entity').html('<img src="' + entity.image.data + '" title="' + entity.name + '" alt="TIC Incidències" />');
            }
            //phone
            if (entity.phone) {
                $('#phone-entity').show();
                $('#phone-entity').html('<a href="tel:' + entity.phone + '"><span class="ico-phone transition before">' + entity.phone + '</span></a>');
            } else {
                $('#phone-entity').hide();
            }


            //URL 
            if (entity.web) {
                $('#web-entity').show();
            } else {
                $('#web-entity').hide();
            }

            //CATEGORIES
            bitgrup.entities.setCategories(entity.category);

            //NEWS
            bitgrup.news.rss = entity.rss;
            bitgrup.news.getNode();
        },

        setCategories: function (categories) {
            bitgrup.entities.category = categories;
            var html = '';
            $(categories).each(function (n) {
                var category = categories[n];
                var img = (category.image.name && category.image.name !== 'NO IMAGE') ? category.image.name : 'icons/question.svg';
                //cada 3 hem de ficar un row
                if (n % 3 == 0) {
                    html += '<div class="row">';
                }
                html += '<div class="col-xs-4">' +
                        '<button onclick="bitgrup.issues.new_.setType(' + category.id + ')">' +
                        '<div class="col-xs-12">' +
                        '<img src="' + img + '" title="' + category.title + '"/>' +
                        '</div>' +
                        '<div class="col-xs-12">' +
                        '<span>' + category.title + '</span>' +
                        '</div>' +
                        '</button>' +
                        '</div>';
                if (n % 3 == 2) {
                    html += '</div>';
                }
            });
            $('#type-list-issue').html(html);
        },

        logOut: function () {
            //ACTUALITZAM BBDD
            dataBase.query('UPDATE CONFIG SET ENTITY_ID = ? ', [0], function (resp) {
                bitgrup.entities.chooseEntity();
            });
        },

        error() {
            bitgrup.alert('Ho sentim, l\'ajuntament no està disponible temporalment. Disculpi les molèsties');
            bitgrup.initScreen();
        }
    },

    /* ###########################################################################*/
    /* ######################         ISSUES          ############################*/
    /* ###########################################################################*/

    issues: {

        //types: ["Xarxa d'aigua", "Parcs infantils i mobiliari urbà", "Neteja i gestió de residus", "Enllumenat", "Obra i via pública", "Altres", "Suggeriments"],
        status: [{id: 1, name: 'Pendent', color: 'yellow'}, {id: 2, name: 'En curs', color: 'orange'}, {id: 3, name: 'Resolta', color: 'green'}, {id: 0, name: 'Rebutjada', color: 'red'}],

        init: function () {
            //REFRESH
            $('#issues-list-content').xpull({callback: function () {
                    bitgrup.issues.list.init();
                    bitgrup.changePage('issues-list');
                }});

        },

        insertIssuesMap: function () {
            try {
                bitgrup.mapa.map.clear();
            } catch (e) {
                //EL MAPA NO S'HA INICIAT
            }
            var issues = bitgrup.issues.list.issues;
            if (issues) {
                $(issues).each(function (i) {
                    bitgrup.mapa.insertMarker(issues[i]);
                });
            }
        },

        deleteIssue: function () {
            var id = bitgrup.issues.issueId;
            bitgrup.confirm('Està segur?', function (buttonIndex) {
                if (buttonIndex == 1) {
                    //ELIMINAM
                    dataBase.query('DELETE FROM ISSUES WHERE ID = ? ', [id], function (result) {
                        bitgrup.issues.list.init();
                        bitgrup.back();
                    });
                }
            });
        },

        /*-=-=-=-=-=-=      LIST     -=-=-=-=-=-=-=-=--*/
        list: {

            numIssues: 0,
            html: '',
            issues: null,

            toList: function () {
                bitgrup.issues.list.init();
                bitgrup.changePage('issues-list');
            },

            init: function () {
                try {
                    bitgrup.spinner.on();
                    api.getIssues(function () {
                        bitgrup.issues.list.setList();
                    });
                } catch (e) {
                    bitgrup.log('init 248', e);
                    bitgrup.spinner.off();
                }
            },

            updateIssues: function (issuesStatus, callback) {
                var total = issuesStatus.length;
                if (total) {
                    $(issuesStatus).each(function (n) {
                        var issue = issuesStatus[n];
                        var dades = [issue.status, issue.id, parseInt(bitgrup.config.ENTITY_ID)];
                        dataBase.query('UPDATE ISSUES SET STATUS = ? WHERE ID = ? AND FK_ENTITY = ?  ', dades, null);
                        if (n >= (total - 1)) {
                            callback();
                        }
                    });
                } else {
                    callback();
                }
            },

            setList: function () {
                var numIssues = 0;
                var issues = new Array();
                dataBase.query('SELECT * FROM ISSUES WHERE FK_ENTITY = ? ORDER BY ID DESC', [parseInt(bitgrup.config.ENTITY_ID)], function (result) {
                    numIssues = result.length;
                    if (numIssues) {
                        var issue_number = 0;
                        $(result).each(function (i) {
                            issue_number++;
                            //PER A CADA INCIDENCIA AGAFAM LES IMATGES
                            var issue = result[i];
                            var imgs = new Array();
                            dataBase.query('SELECT * FROM PICTURES WHERE FK_ISSUE = ? ', [issue.ID], function (result_img) {
                                $(result_img).each(function (j) {
                                    var img = result_img[j].BASE_64;
                                    imgs.push(img);
                                });
                                issue.IMGS = imgs;
                                issues.push(issue);
                                bitgrup.issues.list.getHtml(issues, issue_number, numIssues);
                            });
                        });
                    } else {
                        bitgrup.issues.list.issues = new Array();
                        bitgrup.issues.insertIssuesMap();
                        $('#div-list').html('<h4>No tens cap incidència!<br><small>Aquí veuràs una llista amb les teves incidències.</small></h4>');
                        bitgrup.spinner.off();
                    }
                });
            },

            getHtml: function (issues, issue_number, numIssues) {
                var html = '';
                if (issue_number >= numIssues) {
                    bitgrup.issues.list.issues = issues;
                    bitgrup.issues.insertIssuesMap();
                    $(issues).each(function (i) {
                        var issue = issues[i];
                        var html_img = '';
                        var status = bitgrup.issues.status;

                        /*#################     PICTURES        ####################*/
                        var imgs = issue.IMGS;
                        if (imgs.length > 0) {
                            var num_img = 0;
                            $(imgs).each(function (j) {
                                num_img++;
                                if (num_img == 1) {
                                    html_img = html_img + '<div class="col-xs-6" style="background-image: url(\'' + imgs[j] + '\');">\n\
                                                                <a data-fancybox="gallery_' + issue.ID + '" href="' + imgs[j] + '">\n\
                                                                    <i class="ico ico-plus"></i>\n\
                                                                </a>';
                                } else {
                                    html_img = html_img + '<a data-fancybox="gallery_1" href="' + imgs[j] + '"></a>';
                                }
                            });
                            html_img = html_img + '</div>';
                        } else {
                            html_img = html_img + '<div class="col-xs-6 no-img before"></div>';
                        }
                        /*#################     STATUS        ####################*/
                        var html_status = '';
                        var str_status = '';
                        $(status).each(function (n) {
                            var active = '';
                            if (status[n].id == issue.STATUS) {
                                active = 'active';
                                str_status = status[n].name;
                            }
                            html_status = html_status + '<span class="' + status[n].color + ' ' + active + '"></span>';
                        });

                        /*#################     DESCRIPTION        ####################*/
                        html = html + '\n\
                            <div class="col-xs-12 item-swipe">' + html_img + '\n\
                                <div class="col-xs-6">\n\
                                    <h5 onclick="bitgrup.issues.getIssue(' + issue.ID + ');">' + bitgrup.maxWords(issue.DESCRIPTION) + '</h5>\n\
                                    <p>' + issue.DATE + '</p>\n\
                                    <div class="traffic-light">\n\
                                        ' + html_status + '\n\
                                        <p class="traffic-light-status">' + str_status + '</p>\n\
                                    </div>\n\
                                </div>\n\
                            </div>';
                    });

                    /*INSERT HTML*/
                    $('#div-list').html(html);
                    bitgrup.issues.list.getList();
                    bitgrup.spinner.off();
                }
            },

            getList: function () {
                $('#div-map').fadeOut(300, function () {
                    $('#div-list').fadeIn(300);
                });

            },
            getMap: function () {

                $('#div-list').fadeOut(300, function () {
                    $('#div-map').fadeIn(300);
                    if (!bitgrup.mapa.init('map_canvas_list')) {
                        bitgrup.issues.list.getList();
                    }
                });

            }
        },

        /*-=-=-=-=-=-=      GET ISSUE     -=-=-=-=-=-=-=-=--*/
        issueId: 0,

        getIssue: function (ID) {
            bitgrup.issues.issueId = ID;
            bitgrup.spinner.on();
            try {
                var issues = new Array();
                bitgrup.spinner.on();
                var numIssues = 0;
                dataBase.query('SELECT * FROM ISSUES WHERE ID = ?', [ID], function (result) {
                    var issue = result[0];
                    if (issue) {
                        //DATA
                        $('#issue-card-type').html(bitgrup.issues.getNameType(issue.TYPE));
                        $('#issue-card-adress').html(issue.ADDRESS + ', ' + issue.LOCATION + '<br>' + issue.DATE + '<br>' + issue.HOUR);
                        $('#issue-card-description').html(issue.DESCRIPTION);
                        //STATUS
                        var status = bitgrup.issues.status;
                        var str_status = '';
                        var status_name = '';
                        $(status).each(function (i) {
                            var active = '';
                            if (status[i].id == issue.STATUS) {
                                active = 'active';
                                status_name = status[i].name;
                            }
                            str_status = str_status + '<span class="' + status[i].color + ' ' + active + '"></span>';
                        });
                        $('#issue-card-traffic-light').html(str_status + '<p class="traffic-light-status">' + status_name + '</p>');
                        //IMGS
                        var num_img = 0;
                        for (var i = 0; i < bitgrup.issues.new_.maxImgs; i++) {
                            $('#issue-card-img-' + (i + 1)).removeClass('img').addClass('before').css('background-image', 'none');
                        }

                        dataBase.query('SELECT * FROM PICTURES WHERE FK_ISSUE = ? ', [issue.ID], function (result_img) {
                            var num_imgs = result_img.length;
                            if (num_imgs > 0) {
                                $(result_img).each(function (j) {
                                    num_img++;
                                    var img = result_img[j].BASE_64;
                                    $('#issue-card-img-' + num_img).removeClass('before').addClass('img').css('background-image', 'url(\'' + img + '\')');
                                    bitgrup.issues.getIssueFinally(num_imgs, num_img);
                                });
                            } else {
                                bitgrup.issues.getIssueFinally(0, 0);
                            }
                        });

                    } else {
                        bitgrup.spinner.off();
                        bitgrup.alert('No ha estat possible llegir la incidència');
                    }

                });

            } catch (e) {
                bitgrup.log('init 439', e);
                bitgrup.spinner.off();
                bitgrup.alert('No ha estat possible llegir la incidència');
            }

        },

        getIssueFinally: function (num_imgs, num_img) {
            if (num_img >= num_imgs) {
                bitgrup.changePage('issues-card');
                bitgrup.spinner.off();
            }
        },

        getNameType: function (id) {
            //return bitgrup.issues.types[n - 1];
            var cats = bitgrup.entities.category;
            var name = 'Indefinit';
            $(cats).each(function (n) {
                //bitgrup.log('cat: ', cats[n], cats[n].id, id);
                if (id == cats[n].id) {
                    name = cats[n].title;
                }
            });
            return name;
        },

        /*-=-=-=-=-=-=      NEW ISSUE     -=-=-=-=-=-=-=-=--*/

        new_: {
            //PARÀMETRES
            type: 0,
            imgs: new Array('', '', '', ''),
            email: '',
            description: '',
            adress: null,
            location: null,
            maxImgs: 4,
            numImgs: 0,

            init: function () {
                bitgrup.issues.new_.type = 0;
                bitgrup.issues.new_.imgs = new Array('', '', '', '');
                bitgrup.issues.new_.description = '';
                $('#desc-issue').val('');
                bitgrup.issues.new_.adress = null;
                bitgrup.issues.new_.location = null;
                bitgrup.issues.new_.numImgs = 0;
                //RESET IMGS
                for (var i = 0; i < bitgrup.issues.new_.maxImgs; i++) {
                    bitgrup.pictures.setNoPicture(i + 1);
                }
                bitgrup.changePage('issues-step-1');
            },

            setType: function (type) {
                bitgrup.issues.new_.type = parseInt(type);
                bitgrup.changePage('issues-step-2');
            },

            setLocation: function () {
                bitgrup.changePage('issues-step-3');
                if (!bitgrup.mapa.init('map_canvas')) {
                    bitgrup.changePage('issues-step-2');
                }
            },

            setData: function () {
                //EMAIL
                if (bitgrup.production) {
                    var email = $('#email-issue').val();
                    var desc = $('#desc-issue').val();
                } else {
                    var email = 'tmarqueno@bitgrup.com';
                    var desc = 'Lorem ipsum fistro pecador de la padrera, candemore anau jaar.';
                }

                var countDesc = desc.length;
                if (email) {
                    if (countDesc > 19) {
                        bitgrup.issues.new_.email = email;
                        bitgrup.issues.new_.description = desc;
                        bitgrup.issues.new_.setCard();
                    } else {
                        bitgrup.alert('La descripció ha de tenir un mínim de 20 caràcters.');
                    }
                } else {
                    bitgrup.alert('La direcció de correu es obligatoria.');
                }
            },

            setCard: function () {
                var fecha = new Date();
                var today = fecha.getDate() + '/' + (fecha.getMonth() + 1) + '/' + fecha.getFullYear();
                var time = fecha.getHours() + ':' + fecha.getMinutes();
                $('#new-issue-type').html(bitgrup.issues.getNameType(bitgrup.issues.new_.type));
                $('#new-issue-description').html(bitgrup.issues.new_.description);
                try {
                    $('#new-issue-adress').html(bitgrup.issues.new_.adress.adressa + ', ' + bitgrup.issues.new_.adress.poblacio + '<br>' + today + '<br>' + time);
                    bitgrup.changePage('issues-step-5');
                } catch (e) {
                    if (bitgrup.production) {
                        bitgrup.alert('No hi ha una adressa vàlida!', function () {
                            bitgrup.issues.new_.setLocation();
                        });
                    } else {
                        $('#new-issue-adress').html('Adressa de test, 13, Artà <br>' + today + '<br>' + time);
                        bitgrup.issues.new_.location = {lat: 39.695525, long: 3.351839};
                        bitgrup.issues.new_.adress = {adressa: 'Adressa de test, 13', poblacio: 'Artà'};
                        bitgrup.changePage('issues-step-5');
                    }
                }

            },

            send: function () {
                bitgrup.spinner.on();
                var fecha = new Date();
                var today = fecha.getDate() + '/' + (fecha.getMonth() + 1) + '/' + fecha.getFullYear();
                var time = fecha.getHours() + ':' + fecha.getMinutes();

                /*SAVE ON DATA BASE*/
                //GET LAST ID
                try {
                    dataBase.query('SELECT MAX(ID) AS LAST FROM ISSUES', null, function (result) {
                        if (result) {
                            var ID = (result[0].LAST) ? parseInt(result[0].LAST) + 1 : 1;
                            //Primer enviam la incidencia al Consell, i si falla ja no insertam a la BBDD.   
                            var imagesDt = new Array();
                            var i = 0;
                            bitgrup.pictures.optionsArray.forEach(function (option) {
                                var imageDt = {name: option['name'] + ID, format: option['format'], height: option['height'], width: option['width'], data: bitgrup.issues.new_.imgs[i]};
                                imagesDt.push(imageDt);
                                i++;
                            });
                            var locationDt = {latitude: bitgrup.issues.new_.location.lat, longitude: bitgrup.issues.new_.location.long, altitude: bitgrup.issues.new_.location.lat};
                            var issueDt = {id: ID, category: bitgrup.issues.new_.type, date: new Date(), description: bitgrup.issues.new_.description, location: locationDt, image: imagesDt};
                            api.sendIssue(bitgrup.config.ENTITY_ID, issueDt, function (idIssue) {
                                if (idIssue) {
                                    //INSERT ISSUE
                                    dataBase.query('INSERT INTO ISSUES (ID,FK_ENTITY,TYPE,DESCRIPTION,DATE,HOUR,STATUS,LATITUDE,LONGITUDE,ADDRESS,LOCATION) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
                                            [parseInt(idIssue), parseInt(bitgrup.config.ENTITY_ID), bitgrup.issues.new_.type, bitgrup.issues.new_.description, today, time, 1, bitgrup.issues.new_.location.lat, bitgrup.issues.new_.location.long,
                                                bitgrup.issues.new_.adress.adressa, bitgrup.issues.new_.adress.poblacio],
                                            function (result) {
                                                if (result) {
                                                    //INSERT MARKER
                                                    bitgrup.mapa.insertMarker({ID: idIssue, DESCRIPTION: bitgrup.issues.new_.description, LATITUDE: bitgrup.issues.new_.location.lat, LONGITUDE: bitgrup.issues.new_.location.long});
                                                    //INSERT PICTURES
                                                    dataBase.query('SELECT MAX(ID) AS LAST FROM PICTURES', null, function (result) {
                                                        var ID_P = (result[0].LAST) ? parseInt(result[0].LAST) + 1 : 1;
                                                        for (var i = 0; i < bitgrup.issues.new_.maxImgs; i++) {
                                                            if (bitgrup.issues.new_.imgs[i]) {
                                                                dataBase.query('INSERT INTO PICTURES (ID,FK_ISSUE,BASE_64) VALUES (?,?,?)', [ID_P, idIssue, bitgrup.issues.new_.imgs[i]], function () {});
                                                                ID_P++;
                                                            }
                                                        }
                                                        bitgrup.issues.new_.sendOK();
                                                    });
                                                } else {
                                                    bitgrup.issues.new_.sendNoOK();
                                                }
                                            }
                                    );
                                } else {
                                    bitgrup.issues.new_.sendNoOK();
                                }
                            });
                        } else {
                            bitgrup.issues.new_.sendNoOK();
                        }
                    });
                } catch (e) {
                    bitgrup.issues.new_.sendNoOK();
                }

            },

            sendOK: function () {
                $('#issues-step-6').removeClass('msg-error');
                $('#ico-step-6').addClass('ico-end');
                $('#ico-step-6').removeClass('ico-error');
                $('#title-step-6').html('La teva incidència s\'ha enviat correctament. Gràcies.');
                bitgrup.changePage('issues-step-6');
                bitgrup.spinner.off();
            },
            sendNoOK: function () {
                $('#issues-step-6').addClass('msg-error');
                $('#ico-step-6').addClass('ico-error');
                $('#ico-step-6').removeClass('ico-end');
                $('#title-step-6').html('Ups! Qualque cosa no ha anat bé, si l\'error continua posis en contacte amb el responsable de l\'aplicació. Gràcies.');
                bitgrup.changePage('issues-step-6');
                bitgrup.spinner.off();
            }
        }

    },

    /* ###########################################################################*/
    /* ######################          NEWS           ############################*/
    /* ###########################################################################*/

    news: {
        rss: '',
        newsArray: new Array(),
        idNew: 0,
        numNews: 0,
        node: '',

        init: function () {
            //REFRESH
            $('#news-list-content').xpull({callback: function () {
                    bitgrup.news.list();
                }});
        },

        getNode: function () {
            try {
                var yql = bitgrup.news.rss;
                $.ajax({type: "GET",url: yql, dataType: "xml",beforeSend: function () {  bitgrup.spinner.force(1); }, success: function(rss){
                    var items = $(rss).find("item");
                    if (items) {
                        bitgrup.news.node = 1;
                        $('#btn-home-news').addClass('active');
                    } else {
                        bitgrup.news.node = 0;
                        $('#btn-home-news').removeClass('active');
                    }
                    //go to 
                    bitgrup.spinner.force(0);
                    bitgrup.changePage('home');
                    bitgrup.initScreen();
                }});
            } catch (e) {
                bitgrup.news.node = 0;
                $('#btn-home-news').removeClass('active');
                //go to 
                bitgrup.spinner.force(0);
                bitgrup.changePage('home');
                bitgrup.initScreen();
            }
        },

        list: function () {
            try {
                bitgrup.spinner.on();
                bitgrup.news.newsArray = new Array();
                //GET RSS
                var yql = bitgrup.news.rss;
                var i = 0;

                $.get(yql).done(function (rss) {
                    $(rss).find('item').each(function () {
                        i++;
                        var title = $(this).find('title').text();
                        var uri = $(this).find('link').text();
                        var description = $(this).find('resumen').text();
                        if (!description) {
                            description = $(this).find('description').text();
                        }
                        var img = $(this).find("ag\\:ag:image").text();
                        if (!img) {
                            img = $(this).find('image').text();
                        }
                        var pubDate = $(this).find("ag\\:timestamp").text();
                        if (!pubDate) {
                            pubDate = $(this).find('pubDate').text();
                        }
                        var date = new Date(pubDate);
                        //var stringDate = date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear() + ' ' + date.getHours() + ":" + date.getMinutes();
                        var stringDate = date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear();
                        bitgrup.news.newsArray.push({id: i, title: title, description: description, img: img, uri: uri, pubData: stringDate});
                        if (i >= 30) {
                            return false;
                        }
                    });
                    bitgrup.news.numNews = i;
                    bitgrup.news.setList();
                });
            } catch (e) {
                bitgrup.spinner.off();
                bitgrup.log('init 719', e);
                bitgrup.alert('Les notícies no es troben disponibles a n\'aquest moment. Disculpi les molèsties.');
            }
        },

        setList: function () {
            var html = '';
            var news = bitgrup.news.newsArray;
            if (news.length) {
                $(news).each(function (i) {
                    var new_ = news[i];
                    var img = (new_.img) ? new_.img : 'images/news-background.jpg';
                    html = html + '<div class="col-xs-12" onclick="bitgrup.news.getNew(' + i + ');" >\n\
                                    <div class="col-xs-12"><img src="' + img + '"/></div>\n\
                                    <div class="col-xs-12">\n\
                                        <h5>' + new_.title + '</h5>\n\
                                        <div class="col-xs-12">\n\
                                            <p>' + new_.pubData + '</p>\n\
                                        </div>\n\
                                    </div>\n\
                                  </div>';
                });
                $('#div-news-list').html(html);
                bitgrup.changePage('news-list');
                bitgrup.spinner.off();
            } else {
                bitgrup.spinner.off();
                bitgrup.alert('A n\'aquests moments no hi ha notícies publicades. Disculpi les molèsties.');
            } 
        },

        getNew: function (i) {
            //ERROR IOS SHARE
            $('#share').addClass('active');
            //INICIAM
            bitgrup.spinner.on();
            bitgrup.news.idNew = i;
            var new_ = bitgrup.news.newsArray[i];
            $('#card-news-date').html(new_.pubData);
            $('#card-news-title').html(new_.title);
            $('#card-news-description').html(new_.description);
            var img = (new_.img) ? new_.img : 'images/news-background.jpg';
            $('#card-news-img').html('<img src="' + img + '" title="' + new_.title + '" alt="TIC"/>');
            $('#card-news-twitter').data('url', 'https://twitter.com/home?status=' + new_.uri);
            $('#card-news-facebook').data('url', 'https://www.facebook.com/sharer/sharer.php?u=' + new_.uri);
            $('#card-news-whatsapp').data('url', 'whatsapp://send?text=' + new_.uri);
            //BOTONS NEXT - PREVIOUS
            if (bitgrup.news.idNew === 0) {
                $('#card-news-previous').css('opacity', 0);
            } else {
                $('#card-news-previous').css('opacity', 1);
            }
            if (bitgrup.news.idNew === (bitgrup.news.numNews - 1)) {
                $('#card-news-next').css('opacity', 0);
            } else {
                $('#card-news-next').css('opacity', 1);
            }
            bitgrup.news.linkToPhonegap();
            bitgrup.changePage('news-card');
            //SI BOTONS SHARE ELS AMAGAM
            if ($('#share').hasClass('active')) {
                bitgrup.news.initButtonShareAnimation();
            } else {

            }
            bitgrup.spinner.off();

        },

        next: function () {
            var actual = bitgrup.news.idNew;
            var last_index = bitgrup.news.numNews - 1;
            if (actual < last_index) {
                actual++;
                bitgrup.news.getNew(actual);
                $('#news-card .ui-content').animate({scrollTop: $('#news-card').offset().top - 20}, 'slow');
            }
        },

        previous: function () {
            var actual = bitgrup.news.idNew;
            if (actual > 0) {
                actual--;
                bitgrup.news.getNew(actual);
                $('#news-card .ui-content').animate({scrollTop: $('#news-card').offset().top - 20}, 'slow');
            }
        },

        linkToPhonegap: function () {
            //canviam els links per window.load
            $('#card-news-description a').each(function () {
                var href = $(this).attr('href');
                $(this).attr('href', '#');
                $(this).click(function () {
                    bitgrup.carregaPagExt(href);
                });
            });
        },

        initButtonShareAnimation: function () {
            var ul = $("#share"), li = $("#share li"), i = li.length, n = i - 1, r = 20;
            ul.toggleClass('active');
            if (ul.hasClass('active')) {
                for (var a = 0; a < i; a++) {
                    li.eq(a).css({
                        'transition-delay': "" + (50 * a) + "ms",
                        '-webkit-transition-delay': "" + (50 * a) + "ms",
                        'left': (r * Math.cos(90 / n * (a + 1) * (Math.PI / 180))) + 'vw',
                        'top': (-r * Math.sin(90 / n * (a + 1) * (Math.PI / 180))) + 'vw'
                    });
                }
            } else {
                li.removeAttr('style');
            }
        }
    },

    /* ###########################################################################*/
    /* ######################          MAP          ############################*/
    /* ###########################################################################*/

    mapa: {

        map: null,

        init: function (id) {
            try {
                if (!bitgrup.mapa.map) {
                    var div = document.getElementById(id);
                    //OPCIONS
                    var options = {
                        'camera': {target: {lat: 39.625908, lng: 2.973964}, zoom: 15},
                        'backgroundColor': '#FFFFFF',
                        'mapType': plugin.google.maps.MapTypeId.ROADMAP,
                        'controls': {'myLocation': true},
                        'gestures': {'scroll': true, 'tilt': true, 'rotate': true, 'zoom': true}
                    };
                    bitgrup.mapa.map = plugin.google.maps.Map.getMap(div, options);
                    bitgrup.mapa.map.setClickable(true);
                    bitgrup.mapa.map.getVisibleRegion();
                    bitgrup.mapa.map.one(plugin.google.maps.event.MAP_READY, bitgrup.mapa.onMapInit);
                } else {
                    //CHANGE DIV MAP AND LOCATION
                    var div = document.getElementById(id);
                    bitgrup.mapa.map.setDiv(div);
                    bitgrup.mapa.getLocation();
                }
                return true;
            } catch (e) {
                if (bitgrup.production) {
                    bitgrup.alert('El Mapa no està disponible, revisi la configuració del seu telèfon i doni permisos per poder utilitzar el mapa.');
                    return false;
                } else {
                    return true;
                }
            }
        },

        onMapInit: function () {
            bitgrup.mapa.getLocation();
            // SI CLICK GUARDAM NOVA LOCALITZACIÓ
            bitgrup.mapa.clickEvent();
            //INSERTAM INCIDÈNCIES CREADES
            bitgrup.issues.insertIssuesMap();
        },

        clickEvent: function () {
            var evtName = plugin.google.maps.event.MAP_CLICK;
            bitgrup.mapa.map.on(evtName, function (latLng) {
                bitgrup.mapa.map.trigger("MARKER_REMOVE");
                bitgrup.issues.new_.location = {'lat': latLng.lat, 'long': latLng.lng};
                const NOVAPOSICIO = new plugin.google.maps.LatLng(latLng.lat, latLng.lng);
                bitgrup.mapa.getAdress(NOVAPOSICIO);
            });
        },

        getLocation: function () {
            var option = {enableHighAccuracy: true};
            plugin.google.maps.LocationService.getMyLocation(option, function (location) {
                //CAMERA POSITION
                var lat = location.latLng.lat;
                var long = location.latLng.lng;
                bitgrup.mapa.changeCamera(lat, long);
                const NOVAPOSICIO = new plugin.google.maps.LatLng(lat, long);
                bitgrup.mapa.getAdress(NOVAPOSICIO);
                bitgrup.issues.new_.location = {'lat': lat, 'long': long};
            });
        },

        getAdress: function (posicio) {
            bitgrup.mapa.map.trigger("MARKER_REMOVE");
            var request = {'position': posicio};
            var adressa = {'adressa': null, 'poblacio': null};
            plugin.google.maps.Geocoder.geocode(request, function (results) {
                if (results.length) {
                    var result = results[0];
                    var position = result.position;
                    var address = [result.thoroughfare || "", result.locality || "", result.postalCode || ""].join(", ");
                    bitgrup.mapa.map.addMarker({'position': position, 'title': address}, function (marker) {
                        marker.showInfoWindow();
                        bitgrup.mapa.map.addEventListenerOnce("MARKER_REMOVE", function () {
                            marker.remove();
                        });
                    });
                    adressa.adressa = result.thoroughfare;
                    adressa.poblacio = result.locality;
                } else {
                    bitgrup.alert("No es pot aconseguir la vostra ubicació");
                }
            });
            bitgrup.issues.new_.adress = adressa;
        },

        changeCamera: function (lat, long) {
            bitgrup.mapa.map.animateCamera({
                target: {lat: lat, lng: long},
                zoom: 17,
                tilt: 60,
                bearing: 0,
                duration: 2000
            }, function () {
                //alert("Camera target has been changed");
            });
        },

        insertMarker: function (issue) {
            try {
                var icon = 'www/icons/warning.png';
                if (device.platform === 'Android') {
                    var icon = 'icons/warning.png';
                }
                const POSITION = {"lat": issue.LATITUDE, "lng": issue.LONGITUDE};
                var htmlInfoWindow = new plugin.google.maps.HtmlInfoWindow();
                var html = ['<div class="mapInfowindow"><b>' + bitgrup.maxWords(issue.DESCRIPTION) + '</b><div><button type="buttton" onclick="bitgrup.issues.getIssue(' + issue.ID + ');">Veure</button></div></div>'].join("");
                htmlInfoWindow.setContent(html);
                var marker = bitgrup.mapa.map.addMarker({
                    position: POSITION,
                    icon: {url: icon}
                });
                marker.on(plugin.google.maps.event.MARKER_CLICK, function () {
                    htmlInfoWindow.open(marker);
                });
                return marker;
                //marker.trigger(plugin.google.maps.event.MARKER_CLICK);
            } catch (e) {

            }
        }

    },

    /* ###########################################################################*/
    /* ######################        PICTURES         ############################*/
    /* ###########################################################################*/

    pictures: {

        optionsArray: new Array(),

        getPicture: function (type) {
            if (bitgrup.issues.new_.numImgs < bitgrup.issues.new_.maxImgs) {
                if (type === 'camera') {
                    navigator.camera.getPicture(bitgrup.pictures.onSuccess, bitgrup.pictures.onFail, {
                        quality: 50,
                        destinationType: Camera.DestinationType.FILE_URI,
                        correctOrientation: true
                    });
                } else if (type === 'gallery') {
                    navigator.camera.getPicture(bitgrup.pictures.onSuccess, bitgrup.pictures.onFail, {
                        quality: 50,
                        destinationType: Camera.DestinationType.FILE_URI,
                        sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY,
                        correctOrientation: true
                    });
                }
            } else {
                bitgrup.alert('No es poden afegir més imatges.');
            }
        },

        onSuccess: function (imageData) {
            bitgrup.issues.new_.numImgs++;
            var num_imgs = bitgrup.issues.new_.numImgs;
            bitgrup.pictures.setPicture(imageData, num_imgs);
        },

        onFail: function (e) {
            bitgrup.log('init 1005', e);
            bitgrup.alert('No s\'ha pogut aconseguir la imatge');
        },

        setPicture: function (imageData, num_imgs) {
            bitgrup.pictures.getPictureOptions(imageData, function (result) {

                result['name'] = 'img' + api.deviceId + num_imgs;
                bitgrup.pictures.optionsArray.push(result);

                var id = 'new-issue-img-' + num_imgs;
                var id_card = 'new-issue-card-img-' + num_imgs;
                //get img
                $('#' + id).addClass('remove');
                $('#' + id).css('background-image', "url('" + imageData + "')");
                //card img
                $('#' + id_card).addClass('img');
                $('#' + id_card).removeClass('before');
                $('#' + id_card).css('background-image', "url('" + imageData + "')");
                bitgrup.pictures.toDataURL(imageData, num_imgs - 1);
                //bitgrup.issues.new_.imgs[num_imgs - 1] = imageData; 
            });
        },

        setNoPicture: function (num_imgs) {
            var id = 'new-issue-img-' + num_imgs;
            var id_card = 'new-issue-card-img-' + num_imgs;
            //get img
            $('#' + id).removeClass('remove');
            $('#' + id).css('background-image', "none");
            //card img
            $('#' + id_card).removeClass('img');
            $('#' + id_card).addClass('before');
            $('#' + id_card).css('background-image', "none");
        },

        removeImg: function (numImg) {
            numImg--;
            var imgs = bitgrup.issues.new_.imgs;
            //if exist img
            //bitgrup.log(imgs[numImg]);
            if (imgs[numImg]) {
                bitgrup.confirm('Està segur?', function (buttonIndex) {
                    if (buttonIndex == 1) {
                        //RESET ALL IMATGES
                        for (var i = 0; i < bitgrup.issues.new_.maxImgs; i++) {
                            bitgrup.pictures.setNoPicture(i + 1);
                        }
                        //Reorder imgs in array
                        imgs.splice((numImg), 1);
                        //set img
                        $(imgs).each(function (i) {
                            if (imgs[i]) {
                                bitgrup.pictures.setPicture(imgs[i], (i + 1));
                            }
                        });
                        bitgrup.issues.new_.imgs = imgs;
                        bitgrup.issues.new_.numImgs--;
                    }
                });
            }
        },

        toDataURL: function (uri, img_num) {
            var xhr = new XMLHttpRequest();
            var result = null;
            xhr.onload = function () {
                var reader = new FileReader();
                reader.onloadend = function () {
                    bitgrup.issues.new_.imgs[img_num] = reader.result;
                }
                reader.readAsDataURL(xhr.response);
            };
            xhr.open('GET', uri);
            xhr.responseType = 'blob';
            xhr.send();
        },

        getPictureOptions: function get_image_size_from_URI(imageURI, callback) {
            // This function is called once an imageURI is rerturned from PhoneGap's camera or gallery function
            window.resolveLocalFileSystemURI(imageURI, function (fileEntry) {
                fileEntry.file(function (fileObject) {
                    // Create a reader to read the file
                    var reader = new FileReader();
                    // Create a function to process the file once it's read
                    reader.onloadend = function (evt) {
                        // Create an image element that we will load the data into
                        var image = new Image();
                        image.onload = function (evt) {
                            // The image has been loaded and the data is ready
                            var options = {name: '', format: 'jpg', width: this.width, height: this.height};
                            // We don't need the image element anymore. Get rid of it.
                            image = null;
                            callback(options);
                        };
                        // Load the read data into the image source. It's base64 data
                        image.src = evt.target.result;
                    };
                    // Read from disk the data as base64
                    reader.readAsDataURL(fileObject);
                }, function () {
                    bitgrup.log("There was an error reading or processing this file.");
                });
            });
        }
    },

    /* ###########################################################################*/
    /* ################          GENERAL          ################################*/
    /* ###########################################################################*/



    home: function () {
        //window.location.href = "index.html";
        $.mobile.changePage("#home", {transition: "slide", reverse: true});
    },

    changePage: function (page) {
        $.mobile.changePage("#" + page, {transition: "slide", reverse: false});
    },

    carregaPagExt: function (url) {
        var ref = window.open(url, '_system', 'location=yes');
    },

    alert: function (msg, callback) {
        try {
            if (callback) {
                navigator.notification.alert(msg, callback, 'TIC Incidències', 'Acceptar');
            } else {
                navigator.notification.alert(msg, function () {}, 'TIC Incidències', 'Acceptar');
            }
        } catch (e) {
            alert(msg);
        }
    },

    confirm: function (msg, callback) {
        navigator.notification.confirm(msg, callback, 'TIC Incidències', ['Confirmar', 'Cancelar']);
    },

    warning: {
        success: function () {
            bitgrup.changePage('success');
        },
        error: function (msg) {
            $('#error-mssg').html(msg);
            bitgrup.changePage('error');
        }
    },

    htmlEntities: function (str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    error_: function (code, json, error) {
        bitgrup.log(code, json);
        bitgrup.alert_.error('Ho sentim, qualque cosa no ha anat bé, hem enviat un correu a l\'administrador avisant del problema. Gràcies per la seva col·laboració.');
    },

    exitApp: function () {
        window.location = 'index.html';
    },

    spinner: {
        
        status: 0,
        force_status: 0,
        
        on: function () {
            try {
                SpinnerPlugin.activityStart(" ", {dimBackground: false});
                bitgrup.spinner.status = 1;
            } catch (e) {
                //bitgrup.log(e);
            }
        },
        off: function () {
            try {
                setTimeout(function () {
                    if(bitgrup.spinner.force_status == 0){
                        SpinnerPlugin.activityStop();
                        bitgrup.spinner.status = 0;
                    }else{
                        bitgrup.log('spinner force = 1, no stop spinner');
                    }
                }, 200); 
            } catch (e) {
                //bitgrup.log(e);
            }
        },
        force: function(n){
            bitgrup.spinner.force_status = n;
        }
    },

    includes: function () {
        //INCLUDES:
        /*menu*/ 
        try{
            $('.header-menu').each(function () {
                $(this).load('header.html');
            });
        }catch(e){}
    },

    back: function () {
        window.history.back();
    },

    initScreen: function () {
        $('body .ui-content').removeClass('no-active');
        $('#loading').removeClass('active');
        bitgrup.spinner.off();
    },

    maxWords: function (str) {
        return (str.replace(/^(.{30}[^\s]*).*/, "$1")) + '...';
    },

    setLink: function (button) {
        var url = $(button).data('url');
        bitgrup.carregaPagExt(url);
    },

    getConnection: function () {
        var networkState = navigator.connection.type;
        var states = {};
        states[Connection.UNKNOWN] = 'Unknown';
        states[Connection.ETHERNET] = 'Ethernet';
        states[Connection.WIFI] = 'WiFi';
        states[Connection.CELL_2G] = 'Cell 2G';
        states[Connection.CELL_3G] = 'Cell 3G';
        states[Connection.CELL_4G] = 'Cell 4G';
        states[Connection.CELL] = 'Cell generic connection';
        states[Connection.NONE] = 'No network connection';

        //bitgrup.log('Connection type: ' + states[networkState]);
        return states[networkState];
    },
    
    log: function(str, data){
        if(bitgrup.production){ 
            //$.ajax({type: 'POST', url: 'https://www.bitgrup.com/test.php', data:{str:str, data:data}, async: false, timeout: 3000});
        }else{
            console.log(str, data); 
        }
    }


}


function onLoad() {
    if ((/(ipad|iphone|ipod|android|windows phone)/i.test(navigator.userAgent))) {
        document.addEventListener('deviceready', bitgrup.initApp, false);
        //document.addEventListener("resume", bitgrup.home, false);
    } else {
        bitgrup.initApp();
    }
}


//$(document).ready(function () {
//    bitgrup.initApp();
//});

