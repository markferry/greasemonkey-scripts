// ==UserScript==
// @name imperial-convertor
// @author jerous
// @description Converts imperial units to metric system
// @downloadURL	https://jerous.org/att/2015/03/29/imperial-convertor/imperial-convertor.js
// regexes don't support tld :(
// @exclude        /https://(www\.|mail\.)?google.(be|com|co.uk|fr|ru)/.*/
// @require https://raw.github.com/gentooboontoo/js-quantities/v1.7.5/build/quantities.js
// @version	1.3
// @copyright  2012, 2013, 2014, 2015, 2016, 2017 jerous
// ==/UserScript==


// Version history:
// 1.3 use regex @exclude
// 1.2 update metadata section
// 1.1 apply HTML formatting to the converted units; more strict in what to change; remove "in", "ml", add quote for inch
// 1.0 initial version

// Based on http://userscripts.org/scripts/source/41369.user.js
(function () {
    'use strict';

    function convert(s, unit) {
        var q = Qty.parse(s.replace(/,/g, "")).to(unit);
        return format_si(q.scalar)+q.units();
    }

    function convert_mass(s) {
        var q = Qty.parse(s.replace(/,/g, "")).to("g");
        return sensible_mass(q.scalar);
    }

    function convert_temp(s, unit) {
        var q = Qty.parse(s.replace(/,/g, "")).to("tempC");
        return my_round(q.scalar) + " ℃";
    }

    var prepend_rgx = String.raw`(\d[\d,.]*\s*)`;
    var append_rgx = '([^a-z]|$)';

    var imperials = {
        '(miles|mile|mi)': function(x, p1, p2, p3) {
          return for_output(p1+p2, convert(p1+p2, "m"));
        },
        '(inches|inch)': function(x, p1, p2) {
            return for_output(p1+p2, convert(p1+"in", "m"));
        },
        '(feet|foot|ft)': function(x, p1, p2) {
            return for_output(p1+p2, convert(p1+"ft", "m"));
        },
        '(nautical miles?|nmi)': function(x, p1, p2) {
            return for_output(p1+p2, convert(p1+"nmi", "m"));
        },
        '(knots?|kts?|kns?)': function(x, p1, p2) {
            return for_output(p1+p2, convert(p1+p2, "kph"));
        },

        '(ounces?|oz|pounds?|lb|lbs|stones?|st)': function(x, p1, p2) {
          return for_output(p1+p2, convert_mass(p1+p2));
        },

        '(gallons?|gal)': function(x, p1, p2) {
          return for_output(p1+p2, convert(p1+"gallon-imp", "L"));
        },

        '(US\\s+gallons?)': function(x, p1, p2) {
          return for_output(p1+p2, convert(p1+"gal", "L"));
        },

        // also convert \u00b0 F and \u2109
        '(degrees? fahrenheit| F|°F|℉)': function(x, p1, p2) {
            return for_output(p1+p2, convert_temp(p1+ "tempF"));

        },

    };

    // https://regex101.com/r/nZNHiv/7
    //   1st alt captures 1:ft and 2:in
    //   2nd alt captures 3:ft
    //   3rd alt captures 4:ft
    //
    // also convert \u2032 single-prime and \u2033 double-prime
    var f_i_rgx = /(?:(\d+)[\'\u2032](\d+)(?:\"|\'\'|\u2033)|(\d+(?:\.\d+)?)[\'\u2032](?!\')|(\d+(?:\.\d+)?)(?:\"|\'\'|\u2033))(?![\d[\'\"\u2032\u2033]\b])/

    function parseFeetAndInches(s_fi){
        var mfifi = f_i_rgx.exec(s_fi);

        if (!mfifi) {
            return NaN;
        }

        var feet = (parseFloat(mfifi[1]) || 0) + (parseFloat(mfifi[3]) || 0);
        var inches = (parseFloat(mfifi[2]) || 0) + (parseFloat(mfifi[4]) || 0);
        return feet * 12 + inches;
    }

    var compound_imperials = {
        [f_i_rgx]: function(x, p1, p2, p3, p4) {
            var inches = parseFeetAndInches(x);
            return for_output(x, convert(inches+"in", "m"));
        }
    }


    function my_round(x) {
        return Math.round(x*1e3)/1e3;
    }

    function format_si (n) {
        var nn = n.toExponential(2).split(/e/);
        var u = Math.floor(+nn[1] / 3);
        return nn[0] * Math.pow(10, +nn[1] - u * 3) + ['p', 'n', 'u', 'm', '', 'k', 'M', 'G', 'T'][u+4];
    }


    function sensible_unit(x, units) {
        x*=1e3;

        for(var i=0; i<units.length; i++) {
            if (x<1e3) {
                return my_round(x).toString()+" "+units[i];
            }
            x /= 1e3;
        }
        return my_round(x*1e3).toString()+" "+units[units.length-1];
    }

    function sensible_distance(meter) {
        return sensible_unit(meter, ["mm", "m", "km"]);
    }

    function sensible_mass(mass) {
        return sensible_unit(mass, ["mg", "g", "kg", "ton"]);
    }


    // I haven't found a way yet to edit the innerHTML of a XPath node :(
    function stylize(x) {
        return "<span style='font-size:x-small; color:grey;'>"+x+"</span>";
    }

    function for_output(x, converted) {
        return x+stylize("[="+converted+"]");
    }


    var regexs = [];
    var replacements = [];
    var tagsWhitelist = [
        'PRE',
        'BLOCKQUOTE',
        'CODE',
        'INPUT',
        'BUTTON',
        'TEXTAREA',
        'SPAN',
    ];
    var rIsRegexp = /^\/(.+)\/([gim]+)?$/;
    var word, text, texts, i, userRegexp;

    // function to decide whether a parent tag will have its text replaced or not
    function isTagOk(tag) {
        return tagsWhitelist.indexOf(tag) === -1;
    }

    var rgxs=[];
    var repls=[];

    for(var rgx in imperials) {
        rgxs.push(new RegExp(prepend_rgx+rgx+append_rgx, 'gi'));
        repls.push(imperials[rgx]);
    }

    // 'for var in dict' doesn't work with regex keys
    rgxs.push(f_i_rgx);
    repls.push(compound_imperials[f_i_rgx]);

    // do the replacement
    var texts = document.evaluate(
            '//body//text()[ normalize-space(.) != "" ]',
            document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE , null
    );

    for(i = 0; text = texts.snapshotItem(i); i += 1) {
        if ( isTagOk(text.parentNode.tagName) ) {
           var data=text.data;

            for(var j=0; j<rgxs.length; j++) {
                data=data.replace(rgxs[j], repls[j]);
            }

            if (true) {
                var el=document.createElement("span");
                el.innerHTML=data;
                text.parentNode.replaceChild(el, text);
            } else {
                text.data=data;
            }
        }
    }
}());
