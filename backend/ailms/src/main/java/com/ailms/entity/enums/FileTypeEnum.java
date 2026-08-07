package com.ailms.entity.enums;

/**
 * Phân loại tệp tin theo định dạng lưu trữ trong hệ thống.
 * IMAGE                 : Tập tin hình ảnh (.png, .jpg, .svg...).
 * DOCUMENT              : Tập tin tài liệu (.pdf, .docx, .xlsx...).
 * VIDEO                 : Tập tin video (.mp4, .mkv...).
 * AUDIO                 : Tập tin âm thanh (.mp3, .wav...).
 * OTHER                 : Các định dạng khác.
 */
public enum FileTypeEnum {
    IMAGE,
    DOCUMENT,
    VIDEO,
    AUDIO,
    OTHER
}
