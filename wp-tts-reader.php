<?php
/**
 * Plugin Name: WP TTS Reader
 * Plugin URI:  https://example.com/
 * Description: Dodaje dostępny (WCAG) przycisk do odczytywania treści wpisów i stron (Text-to-Speech) za pomocą Web Speech API.
 * Version:     1.2.0
 * Author:      Your Name
 * Text Domain: wp-tts-reader
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class WP_TTS_Reader {
    public function __construct() {
        add_action( 'wp_enqueue_scripts', array( $this, 'enqueue' ) );
        add_filter( 'the_content', array( $this, 'inject' ) );
    }

    public function enqueue() {
        if ( is_admin() || ! is_singular() ) {
            return;
        }

        $url = plugin_dir_url( __FILE__ );

        wp_enqueue_style(
            'wp-tts-reader',
            $url . 'assets/css/wp-tts-reader.css',
            array(),
            '1.2.0'
        );

        wp_enqueue_script(
            'wp-tts-reader',
            $url . 'assets/js/wp-tts-reader.js',
            array(),
            '1.2.0',
            true
        );

        wp_localize_script(
            'wp-tts-reader',
            'wpTtsReader',
            array(
                'startLabel'      => 'Włącz czytanie tekstu',
                'stopLabel'       => 'Wyłącz czytanie tekstu',
                'startButtonText' => 'Przeczytaj',
                'stopButtonText'  => 'Zatrzymaj czytanie',
                'notSupportedMsg' => 'Twoja przeglądarka nie obsługuje funkcji TTS.',
                'lang'            => get_bloginfo( 'language' ) ? get_bloginfo( 'language' ) : 'pl-PL',
            )
        );
    }

    public function inject( $content ) {
        if ( is_admin() || ! is_singular() ) {
            return $content;
        }

        // Nie pokazuj przycisku na stronie głównej
        if ( is_front_page() || is_home() ) {
            return $content;
        }

        global $post;
        if ( ! $post instanceof WP_Post ) {
            return $content;
        }
        $id = $post->ID;

        $button  = '<div class="wp-tts-reader-controls">';
        $button .= '<button type="button" class="wp-tts-reader-toggle" data-wp-tts-id="' . esc_attr( $id ) . '" aria-pressed="false" aria-label="Włącz czytanie tekstu">';
        $button .= '<span class="wp-tts-reader-icon" aria-hidden="true">
           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-volume-up" viewBox="0 0 16 16">
                <path d="M11.536 14.01A8.47 8.47 0 0 0 14.026 8a8.47 8.47 0 0 0-2.49-6.01l-.708.707A7.48 7.48 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303z"/>
                <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.48 5.48 0 0 1 11.025 8a5.48 5.48 0 0 1-1.61 3.89z"/>
                <path d="M10.025 8a4.5 4.5 0 0 1-1.318 3.182L8 10.475A3.5 3.5 0 0 0 9.025 8c0-.966-.392-1.841-1.025-2.475l.707-.707A4.5 4.5 0 0 1 10.025 8M7 4a.5.5 0 0 0-.812-.39L3.825 5.5H1.5A.5.5 0 0 0 1 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 7 12zM4.312 6.39 6 5.04v5.92L4.312 9.61A.5.5 0 0 0 4 9.5H2v-3h2a.5.5 0 0 0 .312-.11"/>
              </svg>
        </span>';
        $button .= '<span class="wp-tts-reader-text">Przeczytaj</span>';
        $button .= '</button>';
        $button .= '<span class="wp-tts-reader-status sr-only" aria-live="polite"></span>';
        $button .= '</div>';


        $wrapper_open  = '<div class="wp-tts-reader-wrapper" data-wp-tts-id="' . esc_attr( $id ) . '">';
        $wrapper_close = '</div>';

        return $button . $wrapper_open . $content . $wrapper_close;
    }
}

add_action( 'plugins_loaded', function () {
    new WP_TTS_Reader();
} );
?>

