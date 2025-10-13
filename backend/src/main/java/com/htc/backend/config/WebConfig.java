package com.htc.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableWebMvc
@Order(Ordered.HIGHEST_PRECEDENCE)
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // This ensures that any unmapped paths (except API) are forwarded to the frontend
        registry.addViewController("/").setViewName("forward:/index.html");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve static files from the uploads directory
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:uploads/")
                .setCachePeriod(0);
                
        // Serve static resources from classpath using simpler patterns
        registry.addResourceHandler("/static/**")
               .addResourceLocations("classpath:/static/")
               .setCachePeriod(0);
               
        registry.addResourceHandler("/public/**")
               .addResourceLocations("classpath:/public/")
               .setCachePeriod(0);
        
        // Serve static files for non-API paths
        // API paths starting with /api/ will be handled by controllers
        registry.addResourceHandler("/*.js", "/*.css", "/*.html", "/*.json", "/*.png", "/*.jpg", "/*.gif", "/*.ico")
               .addResourceLocations(
                   "classpath:/static/",
                   "classpath:/public/",
                   "classpath:/META-INF/resources/"
               )
               .setCachePeriod(0);
    }
}