'use strict';
const stripIndent = require('strip-indent');

// Start matching after: comment start block => ! or @preserve => optional whitespace => newline
// stop matching before: last newline => optional whitespace => comment end block
const reCommentContents = /\/\*!?(?:@preserve)?[ \t]*(?:\r\n|\n)([\s\S]*?)(?:\r\n|\n)[ \t]*\*\//;

const multiline = (fn, substitutions) => {
	if (typeof fn !== 'string' && typeof fn !== 'function') {
		throw new TypeError('Multiline: Expected an HTML string or a function containing a multiline comment.');
	}
	
	// If the fn is a string (hopefully html)
	if (typeof fn == "string") {
		return on_html(fn, substitutions);
	}

	// If the fn is a function containing a multiline comment
	else if (typeof fn == "function") {
		var match = reCommentContents.exec(fn.toString());
		if (!match) throw new TypeError('Multiline: Comment missing.');
		else {
			var response = match[1];
			return on_html(response, substitutions);
		}
	}

	function on_html (response, ...substitutions) {

		// Perform substitutions
		if (substitutions && Object.keys(substitutions).length > 0) {

			/* 
				! Handlebar substitutions
				*  Credits: Piyush Agade, piyushagade@gmail.com, January 2021

				Example:
				
				var str = multiline(function () {
					/*
						Hi my name is {{person.name}} from {{person.city}}. I work at {{organization}}.
					(*)/
				}, {
					"organization": "University of Florida",
					"person": {
						"name": "Piyush Agade",
						"city": "Gainesville, FL"
					}
				});

				1. The variable 'substitutions' holds the json object that has keys and values of the substitutions to be made.
					{
						person: {
							"name": "Piyush Agade",
							"city": "Gainesville, FL"
						},
						"organization": "University of Florida"
					}

				2. The variable 'response' holds the multiline html/text on which the substitutions are to be made.

				3. The variable 'placeholder' is the string in the 'response' string enclosed between {{ and }}.
					{{person.name}}, {{person.city}}, {{organization}}

				4. 'key' is a placeholder but in a JSON-compatible format. 
					["person"]["name"], ["person"]["city"], ["organization"]
			*/

			var regexr = /(\{{2}[a-zA-Z0-9\-\.]+\}{2})/g;
			if (response.match(regexr)) {
				substitutions = substitutions[0];

				response.match(regexr).forEach(function (placeholder) {
					
					if(!response.match(regexr) || !substitutions) return;

					placeholder.match(regexr).forEach(function (match) {

						var key = "";
						var subkeys = match.replace(/(\{{2}|\}{2})/g, "").split(".");
						
						subkeys.forEach(function (subkey) { 
							key += "[\"" + subkey + "\"]";
						});

						var value;
						/*
							Get the value of the 'key' from the 'substitutions' object
						*/
						try {
							value = eval("substitutions" + key);
						}
						catch(e) {
							console.warn('Key: ' + key + ' not found in substitutions object above. Value set to undefined.');
							value = undefined;
							response = response.replace(new RegExp(placeholder,'g'), value);
						}

						/*
							This is where the substitutions happen
						*/
						if (substitutions && value !== undefined) {
							response = response.replace(new RegExp(placeholder,'g'), value);
						}
						else if (value === undefined) {
							console.warn('Key: ' + key + ' not in not found in substitutions object. Value set to undefined.');
							// response = response.replace(new RegExp(placeholder,'g'), key)
							response = response.replace(new RegExp(placeholder,'g'), undefined);
						}
					});
				});
			}
			
			// %s substitutions
			else {
				substitutions.forEach(function(substitution) {
					response = response.replace(/%s/, substitution);
				});
			}

			return response;
		} 
		else {
			return response;
		}
	}
};

multiline.stripIndent = fn => stripIndent(multiline(fn));

module.exports = multiline;
