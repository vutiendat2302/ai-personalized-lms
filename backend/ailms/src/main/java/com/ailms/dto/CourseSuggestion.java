package com.ailms.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
public class CourseSuggestion {
    private Long id;
    private String name;
    private String link;
    private String categoryName;
    private BigDecimal suggestedPrice;
    private Double avgRating;

    public CourseSuggestion(Long id, String name, String link, String categoryName, BigDecimal suggestedPrice, Double avgRating) {
        this.id = id;
        this.name = name;
        this.link = link;
        this.categoryName = categoryName;
        this.suggestedPrice = suggestedPrice;
        this.avgRating = avgRating;
    }

    public CourseSuggestion(Long id, String name, String link, String categoryName, BigDecimal suggestedPrice, BigDecimal avgRating) {
        this.id = id;
        this.name = name;
        this.link = link;
        this.categoryName = categoryName;
        this.suggestedPrice = suggestedPrice;
        this.avgRating = avgRating != null ? avgRating.doubleValue() : null;
    }
}
