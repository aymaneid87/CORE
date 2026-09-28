<?php
/**
 * Plugin Name: CI Speed Boost
 * Description: تسريع موقع ci-eg.com على الموبايل — تأجيل ملفات JS، تخفيف خطوط Google، وإلغاء سكربتات غير ضرورية. للإيقاف: عطّل الإضافة. للمقارنة: افتح أي صفحة وأضف ?nospeed=1
 * Version: 1.0.0
 * Requires at least: 6.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function cisb_enabled() {
	if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
		return false;
	}
	if ( isset( $_GET['nospeed'] ) || isset( $_GET['elementor-preview'] ) ) {
		return false;
	}
	return true;
}

/*
 * 1) Defer JavaScript using WordPress' own loading strategy API.
 *    WordPress automatically keeps a script blocking when something depends on it
 *    in a way that would break, so this is the safe way to defer.
 */
add_action( 'wp_print_scripts', function () {
	if ( ! cisb_enabled() ) {
		return;
	}
	$keep_blocking = array( 'jquery', 'jquery-core', 'jquery-migrate' );
	foreach ( wp_scripts()->registered as $handle => $script ) {
		if ( in_array( $handle, $keep_blocking, true ) ) {
			continue;
		}
		// Slider Revolution prints its own inline init code in the page body.
		if ( is_string( $script->src ) && ( false !== strpos( $script->src, '/revslider/' ) || false !== strpos( $handle, 'revslider' ) || 0 === strpos( $handle, 'sr7' ) || 'tp-tools' === $handle ) ) {
			continue;
		}
		if ( empty( $script->extra['strategy'] ) ) {
			wp_script_add_data( $handle, 'strategy', 'defer' );
		}
	}
}, 1 );

/*
 * 2) Google Fonts: drop italic variants and keep only weights 400–700.
 *    The site currently requests ~60 font files; this cuts it to ~15.
 */
function cisb_slim_google_fonts( $src ) {
	if ( ! is_string( $src ) || false === strpos( $src, 'fonts.googleapis.com' ) ) {
		return $src;
	}
	$keep = array( '400', '500', '600', '700' );
	$src  = str_replace( '&#038;', '&', $src );
	$parts = wp_parse_url( $src );
	if ( empty( $parts['query'] ) ) {
		return $src;
	}
	$query = $parts['query'];

	if ( false !== strpos( $parts['path'], 'css2' ) ) {
		// css2 syntax: family=Name:ital,wght@0,300;0,400;1,400
		$query = preg_replace_callback( '/family=([^&:]+):ital,wght@([^&]+)/', function ( $m ) use ( $keep ) {
			$w = array();
			foreach ( explode( ';', $m[2] ) as $pair ) {
				list( $ital, $weight ) = array_pad( explode( ',', $pair ), 2, '' );
				if ( '0' === $ital && in_array( $weight, $keep, true ) ) {
					$w[] = $weight;
				}
			}
			return $w ? 'family=' . $m[1] . ':wght@' . implode( ';', $w ) : 'family=' . $m[1];
		}, $query );
	} else {
		// css (v1) syntax: family=Poppins:100,100italic,...|Mulish:...
		$query = preg_replace_callback( '/family=([^&]+)/', function ( $m ) use ( $keep ) {
			$families = preg_split( '/\||%7C/i', urldecode( $m[1] ) );
			$out      = array();
			foreach ( $families as $fam ) {
				list( $name, $variants ) = array_pad( explode( ':', $fam, 2 ), 2, '' );
				if ( '' === $variants ) {
					$out[] = $name;
					continue;
				}
				$w = array_intersect( explode( ',', $variants ), $keep );
				$out[] = $w ? $name . ':' . implode( ',', $w ) : $name;
			}
			return 'family=' . str_replace( '%2B', '+', rawurlencode( implode( '|', $out ) ) );
		}, $query );
		$query = str_replace( '%7C', '|', $query );
		$query = str_replace( '%3A', ':', str_replace( '%2C', ',', $query ) );
	}
	if ( false === strpos( $query, 'display=' ) ) {
		$query .= '&display=swap';
	}
	$scheme = isset( $parts['scheme'] ) ? $parts['scheme'] . ':' : 'https:';
	return $scheme . '//' . $parts['host'] . $parts['path'] . '?' . $query;
}
add_filter( 'style_loader_src', function ( $src ) {
	return cisb_enabled() ? cisb_slim_google_fonts( $src ) : $src;
}, 20 );

// Connect to the font servers early.
add_action( 'wp_head', function () {
	if ( ! cisb_enabled() ) {
		return;
	}
	echo "<link rel='preconnect' href='https://fonts.googleapis.com'>\n";
	echo "<link rel='preconnect' href='https://fonts.gstatic.com' crossorigin>\n";
}, 1 );

/*
 * 3) Remove things the site does not need on the front end.
 */
add_action( 'init', function () {
	if ( ! cisb_enabled() ) {
		return;
	}
	remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
	remove_action( 'wp_print_styles', 'print_emoji_styles' );
	remove_action( 'wp_head', 'wp_oembed_add_host_js' );
	remove_action( 'wp_head', 'rsd_link' );
	remove_action( 'wp_head', 'wlwmanifest_link' );
} );

add_action( 'wp_enqueue_scripts', function () {
	if ( ! cisb_enabled() ) {
		return;
	}
	// Block editor styles are not used by the Elementor-built pages.
	foreach ( array( 'wp-block-library', 'wp-block-library-theme', 'global-styles', 'classic-theme-styles' ) as $h ) {
		wp_dequeue_style( $h );
	}
}, 100 );

// Slow down the WordPress heartbeat (reduces server load).
add_filter( 'heartbeat_settings', function ( $s ) {
	$s['interval'] = 60;
	return $s;
} );
