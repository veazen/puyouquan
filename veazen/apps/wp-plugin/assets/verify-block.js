/**
 * Gutenberg block: veazen/verify (server-rendered; editor shows a preview
 * placeholder). Classic registration — no build step required.
 */
(function (blocks, element, i18n) {
	'use strict';

	blocks.registerBlockType('veazen/verify', {
		title: i18n.__('Veazen Verify', 'veazen'),
		description: i18n.__('Product authenticity check box, verified against the Veazen cloud.', 'veazen'),
		icon: 'shield-alt',
		category: 'widgets',
		supports: { html: false },
		edit: function () {
			return element.createElement(
				'div',
				{ style: { border: '1px dashed #3fa37c', borderRadius: '4px', padding: '16px' } },
				i18n.__('Veazen verification box — customers enter a product code here. Preview on the front end.', 'veazen')
			);
		},
		save: function () {
			return null; // server-rendered
		},
	});
})(window.wp.blocks, window.wp.element, window.wp.i18n);
