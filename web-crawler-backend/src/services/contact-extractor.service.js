const logger = require('../utils/logger');

class ContactExtractorService {
  /**
   * Extract comprehensive contact information from element or text
   */
  extractContactInfo($elem) {
    return {
      phone: this.extractPhones($elem),
      email: this.extractEmails($elem),
      hours: this.extractHours($elem),
      fax: this.extractFax($elem),
      website: this.extractWebsite($elem)
    };
  }

  /**
   * Extract phone numbers with international format support
   */
  extractPhones($elem) {
    const text = $elem.text();
    const phones = new Set();

    // Phone patterns
    const patterns = [
      // US: (123) 456-7890, 123-456-7890, 123.456.7890
      /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      // International: +31 20 123 4567, +44 20 1234 5678
      /\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,4}/g,
      // European: 020 123 4567, 0031 20 123 4567
      /\b0{1,2}\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g,
    ];

    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Clean and validate
          const cleaned = match.trim();
          // Must have at least 7 digits
          const digitCount = (cleaned.match(/\d/g) || []).length;
          if (digitCount >= 7 && digitCount <= 15) {
            phones.add(cleaned);
          }
        });
      }
    });

    // Also check href="tel:" attributes
    $elem.find('a[href^="tel:"]').each((i, link) => {
      const tel = $(link).attr('href').replace('tel:', '').trim();
      if (tel) phones.add(tel);
    });

    return Array.from(phones);
  }

  /**
   * Extract email addresses
   */
  extractEmails($elem) {
    const text = $elem.text();
    const emails = new Set();

    // Email pattern
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = text.match(emailPattern);
    
    if (matches) {
      matches.forEach(email => {
        // Filter out common false positives
        if (!email.includes('example.com') && 
            !email.includes('domain.com') &&
            !email.includes('.png') &&
            !email.includes('.jpg')) {
          emails.add(email.toLowerCase());
        }
      });
    }

    // Also check href="mailto:" attributes
    $elem.find('a[href^="mailto:"]').each((i, link) => {
      const email = $(link).attr('href').replace('mailto:', '').split('?')[0].trim();
      if (email && email.includes('@')) emails.add(email.toLowerCase());
    });

    return Array.from(emails);
  }

  /**
   * Extract operating hours
   */
  extractHours($elem) {
    const text = $elem.text();
    const hours = [];

    // Common hours patterns
    const patterns = [
      // "Monday - Friday: 9:00 AM - 5:00 PM"
      /(Monday|Mon|Tuesday|Tue|Wednesday|Wed|Thursday|Thu|Friday|Fri|Saturday|Sat|Sunday|Sun)[\s-]+(to|through|thru|-)[\s]+(Monday|Mon|Tuesday|Tue|Wednesday|Wed|Thursday|Thu|Friday|Fri|Saturday|Sat|Sunday|Sun)[\s:]+\d{1,2}:\d{2}\s*[AP]M[\s-]+\d{1,2}:\d{2}\s*[AP]M/gi,
      
      // "Mon-Fri 9am-5pm"
      /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[-]+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{1,2}[ap]m[-–]\d{1,2}[ap]m/gi,
      
      // "9:00 AM - 5:00 PM"
      /\d{1,2}:\d{2}\s*[AP]M[\s-]+\d{1,2}:\d{2}\s*[AP]M/gi,
      
      // "Open Monday-Friday"
      /Open\s+(Monday|Mon|Tuesday|Tue|Wednesday|Wed|Thursday|Thu|Friday|Fri|Saturday|Sat|Sunday|Sun)[\s-]+(Monday|Mon|Tuesday|Tue|Wednesday|Wed|Thursday|Thu|Friday|Fri|Saturday|Sat|Sunday|Sun)/gi,
      
      // "Hours: 9am - 5pm"
      /Hours?[\s:]+\d{1,2}[ap]m[\s-]+\d{1,2}[ap]m/gi
    ];

    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => hours.push(match.trim()));
      }
    });

    // Look for structured hours in time elements
    $elem.find('[itemprop="openingHours"], [class*="hours"], [class*="schedule"]').each((i, elem) => {
      const hourText = $(elem).text().trim();
      if (hourText.length > 5 && hourText.length < 100) {
        hours.push(hourText);
      }
    });

    return [...new Set(hours)]; // Deduplicate
  }

  /**
   * Extract fax numbers
   */
  extractFax($elem) {
    const text = $elem.text();
    const faxNumbers = [];

    // Look for "Fax:" or "F:" followed by number
    const faxPattern = /(?:Fax|F)[\s:]+(\+?[\d\s\-().]+)/gi;
    const matches = text.match(faxPattern);

    if (matches) {
      matches.forEach(match => {
        const number = match.replace(/(?:Fax|F)[\s:]+/i, '').trim();
        const digitCount = (number.match(/\d/g) || []).length;
        if (digitCount >= 7) {
          faxNumbers.push(number);
        }
      });
    }

    return faxNumbers;
  }

  /**
   * Extract website URLs
   */
  extractWebsite($elem) {
    const websites = new Set();

    // Check for links
    $elem.find('a[href^="http"]').each((i, link) => {
      const href = $(link).attr('href');
      if (href && !href.includes('facebook.com') && 
          !href.includes('twitter.com') && 
          !href.includes('linkedin.com') &&
          !href.includes('instagram.com')) {
        try {
          const url = new URL(href);
          websites.add(url.origin);
        } catch (e) {
          // Invalid URL
        }
      }
    });

    return Array.from(websites);
  }

  /**
   * Extract social media links
   */
  extractSocialMedia($elem) {
    const social = {
      facebook: null,
      twitter: null,
      linkedin: null,
      instagram: null
    };

    $elem.find('a[href*="facebook.com"]').each((i, link) => {
      social.facebook = $(link).attr('href');
    });

    $elem.find('a[href*="twitter.com"], a[href*="x.com"]').each((i, link) => {
      social.twitter = $(link).attr('href');
    });

    $elem.find('a[href*="linkedin.com"]').each((i, link) => {
      social.linkedin = $(link).attr('href');
    });

    $elem.find('a[href*="instagram.com"]').each((i, link) => {
      social.instagram = $(link).attr('href');
    });

    return social;
  }

  /**
   * Extract contact person name
   */
  extractContactPerson($elem) {
    const text = $elem.text();
    const names = [];

    // Look for "Contact:" or "Manager:" followed by name
    const namePattern = /(?:Contact|Manager|Director|Coordinator)[\s:]+([A-Z][a-z]+\s+[A-Z][a-z]+)/g;
    const matches = text.match(namePattern);

    if (matches) {
      matches.forEach(match => {
        const name = match.replace(/(?:Contact|Manager|Director|Coordinator)[\s:]+/i, '').trim();
        names.push(name);
      });
    }

    return names;
  }
}

module.exports = new ContactExtractorService();
