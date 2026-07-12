/**
 * Veazen front-end verify widget (§7.1.5).
 * Talks straight to the cloud verify API — never through the WP server.
 * Serial normalization mirrors §2.4: strip separators, uppercase, map
 * confusables (I/L→1, O→0).
 */
(function () {
	'use strict';

	var config = window.veazenVerify || { apiBase: 'https://api.veazen.app/api/v1', i18n: {} };

	function normalize(raw) {
		return raw
			.replace(/[^0-9a-zA-Z]/g, '')
			.toUpperCase()
			.replace(/[IL]/g, '1')
			.replace(/O/g, '0');
	}

	function classify(result) {
		if (result === 'authentic') {
			return { cls: 'ok', text: config.i18n.authentic };
		}
		if (result === 'already_verified') {
			return { cls: 'warn', text: config.i18n.already };
		}
		if (result === 'inactive') {
			return { cls: 'warn', text: config.i18n.inactive };
		}
		if (result === 'flagged') {
			return { cls: 'alert', text: config.i18n.flagged };
		}
		return { cls: 'alert', text: config.i18n.invalid };
	}

	function attach(root) {
		var form = root.querySelector('.veazen-verify__form');
		var input = root.querySelector('.veazen-verify__input');
		var result = root.querySelector('.veazen-verify__result');

		form.addEventListener('submit', function (event) {
			event.preventDefault();
			var serial = normalize(input.value);
			if (!serial) {
				return;
			}
			result.className = 'veazen-verify__result';
			result.textContent = config.i18n.checking;

			fetch(config.apiBase + '/verify/' + encodeURIComponent(serial))
				.then(function (res) {
					return res.json();
				})
				.then(function (body) {
					var view = classify(body.result);
					result.className = 'veazen-verify__result is-' + view.cls;
					result.textContent = view.text;
				})
				.catch(function () {
					result.className = 'veazen-verify__result is-alert';
					result.textContent = config.i18n.error;
				});
		});
	}

	document.addEventListener('DOMContentLoaded', function () {
		var widgets = document.querySelectorAll('[data-veazen-verify]');
		for (var i = 0; i < widgets.length; i += 1) {
			attach(widgets[i]);
		}
	});
})();
