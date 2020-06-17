// ==UserScript==
// @name imperial-convertor
// @author jerous
// @description Converts imperial units to metric system
// @downloadURL	https://jerous.org/att/2015/03/29/imperial-convertor/imperial-convertor.js
// regexes don't support tld :(
// @exclude        /https://(www\.|mail\.)?google.(be|com|co.uk|fr|ru)/.*/
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

    var prepend_rgx='([0-9][0-9,.]*[\\s]*)';
    var append_rgx='([^a-z]|$)';

    var imperials = {
        '(miles|mile|mi)': function(x, p1, p2, p3) { return distance_for_output(p1+p2, mile_to_meter)+p3; },
        '(inches|inch|")': function(x, p1, p2, p3) { return distance_for_output(p1+p2, inch_to_meter)+p3; },
        '(feet|foot|ft)': function(x, p1, p2, p3) { return distance_for_output(p1+p2, foot_to_meter)+p3; },

        '(ounces?|oz)': function(x, p1, p2, p3) { return mass_for_output(p1+p2, ounce_to_gram)+p3; },
        '(pounds?|lb|lbs)': function(x, p1, p2, p3) { return mass_for_output(p1+p2, pound_to_gram)+p3; },
        '(stones?|st)': function(x, p1, p2, p3) { return mass_for_output(p1+p2, stone_to_gram)+p3; },

        '(gallons?|gal)': function(x, p1, p2, p3) { return volume_for_output(p1+p2, gallon_to_litre)+p3; },
        '(US\\s+gallons?)': function(x, p1, p2, p3) { return volume_for_output(p1+p2, gallon_us_to_litre)+p3; },

        // also convert \u00b0 F and \u2109
        '(degrees? fahrenheit| F|°F|℉)': function(x, p1, p2, p3) {
            return temperature_for_output(p1+p2, fahr_to_degree)+p3;
        },

    };

    // Below are the definitions and helpers ...

    var mile_to_meter = 1609.344; // Using the international mile definition
    var inch_to_meter = 0.0254;
    var foot_to_meter = 0.3048;
    var yard_to_meter = 0.9144;

    var ounce_to_gram = 28.35;
    var pound_to_gram = 453.59237;
    var stone_to_gram = 6350.29318;

    var gallon_to_litre = 4.54609;
    var gallon_us_to_litre = 3.7854;

    var fahr_to_degree=function(f) {
        return (f-32)*5/9;
    }


    function my_round(x) {
        return Math.round(x*1e3)/1e3;
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

    function sensible_volume(volume) {
        return sensible_unit(volume, ["mL", "L", "kL"]);
    }

    function sensible_temperature(t) {
        return my_round(t).toString()+" ℃";
    }

    // I haven't found a way yet to edit the innerHTML of a XPath node :(
    function stylize(x) {
        return "<span style='font-size:x-small; color:grey;'>"+x+"</span>";
    }

    function for_output(x, converted) {
        return x+stylize("[="+converted+"]");
    }

    function distance_for_output(x, mult) {
        return for_output(x, sensible_distance(parseFloat(x.replace(",",""))*mult));
    }

    function mass_for_output(x, mult) {
        return for_output(x, sensible_mass(parseFloat(x.replace(",",""))*mult));
    }

    function volume_for_output(x, mult) {
        return for_output(x, sensible_volume(parseFloat(x.replace(",",""))*mult));
    }

    function temperature_for_output(x, func) {
        return for_output(x, sensible_temperature(
                func(parseFloat(x.replace(",","")))
        ));
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
