import React from 'react';

const Privacy: React.FC = () => {
  return (
    <div style={{ textAlign: 'left' }}>
      <p>
        <h1 className="display-4" style={{ textAlign: 'center' }}>Privacy Policy</h1>
      </p>
      <br />

      <p>
        Our website uses Google Tag Manager to help us manage and analyze the usage of our website.
        Google Tag Manager is a tool that allows us to add and manage various website tags, including Google Analytics, through a single interface.
      </p>

      <p>
        Using our website, you consent to the use of Google Tag Manager and the collection and use of data by Google through their privacy policy,
        which can be found at <a href="https://policies.google.com/privacy" style={{ color: '#212529' }}>https://policies.google.com/privacy</a>.
      </p>

      <p>
        We use Google Analytics to understand how our website is used and to help us improve the user experience.
        Google Analytics uses cookies to collect information about website usage,
        including the number of visitors, the websites that referred them, and the pages they visited.
        We do not use Google Analytics to track or collect personally identifiable information.
      </p>

      <p>
        You can opt out of Google Analytics tracking by installing the Google Analytics Opt-out Browser Add-on,
        available at <a href="https://tools.google.com/dlpage/gaoptout" style={{ color: '#212529' }}>https://tools.google.com/dlpage/gaoptout</a>.
      </p>

      <p>
        We may also use other tags through Google Tag Manager, such as tags for conversion tracking and remarketing.
        These tags may collect information about website usage, including pages visited, and actions taken on the website.
      </p>

      <p>
        We do not share any data we collect through Google Tag Manager or Google Analytics with third parties.
      </p>

      <p>
        This privacy policy was last updated on January 26, 2023.
      </p>
      <br />
    </div>
  );
};

export default Privacy;
