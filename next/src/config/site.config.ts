export const siteConfig = {
  company: {
    name: "Cooyue",
    tagline: "Business Consulting",
    description: "Professional business consulting services",
  },

  contact: {
    email: "cooyue@gmail.com",
    phone: "+8614797992768",
    phoneDisplay: "+86 147-9799-2768",
    address: {
      cn: "湖南省长沙市岳麓区",
      en: "Yuelu District, Changsha, Hunan Province, China",
    },
  },

  social: {
    twitter: "#",
    facebook: "#",
    pinterest: "#",
    instagram: "#",
  },

  map: {
    embedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d110998.91028672498!2d112.8693!3d28.2282!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x36a00ad2fd889c9f%3A0x889e2f7d62efa7a8!2sYuelu%20District%2C%20Changsha%2C%20Hunan%2C%20China!5e0!3m2!1sen!2s!4v1679900000000!5m2!1sen!2s",
    address: "Yuelu District, Changsha, Hunan Province, China",
  },

  copyright: {
    year: "2026",
    text: "All Rights Reserved.",
  },

  seo: {
    defaultTitle: "Cooyue - Business Consulting",
    defaultDescription: "Professional business consulting services",
    titleTemplate: (page: string) => `${page} - Cooyue`,
  },
};

export type SiteConfig = typeof siteConfig;
