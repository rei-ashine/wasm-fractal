import React from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

const REPOSITORY = 'https://github.com/rei-ashine/wasm-fractal';

const Terms: React.FC = () => {
  usePageTitle('Terms of Service');
  return (
    <div style={{ textAlign: 'left' }}>
      <h1 className="display-4 mb-3" style={{ textAlign: 'center' }}>Terms of Service</h1>
      <br />

      <p>
        Fractals is a free, personal website run by Rei Ashine, where you can explore fractals rendered in your browser.
        By using it, you agree to these terms.
      </p>

      <ol>
        <li>
          Use of the website: You may use the website freely, without an account.
          Please do not use it in a way that breaks the law or disrupts the website for others.
        </li>

        <li>
          Images you render: The fractal images you render with the website are yours to use, share and modify for any purpose, including commercial use.
          Credit is appreciated but not required.
        </li>

        <li>
          Source code: The source code of the website, including its text, is open source and available on <a href={REPOSITORY} target="_blank" rel="noopener noreferrer">GitHub</a>,
          under the MIT License or the Apache License, Version 2.0, at your option.
          The GitHub mark and the Rust logo are trademarks of their respective owners and are not covered by these licenses.
        </li>

        <li>
          Privacy: The website uses Google Tag Manager and Google Analytics, as described in the <Link to="/privacy">Privacy Policy</Link>.
          It also loads Bootstrap and MathJax from jsDelivr and fonts from Google Fonts, whose own terms apply to those services.
        </li>

        <li>
          No warranty: The website is provided &quot;as is&quot;, without warranty of any kind.
          The images are computed with floating-point arithmetic and are approximations of the mathematical sets, and the website may change or stop at any time.
        </li>

        <li>
          Limitation of liability: To the extent permitted by law, Rei Ashine is not liable for any damage arising from the use of, or the inability to use, the website.
        </li>

        <li>
          Changes: These terms may be updated. The date below shows when they last changed, and using the website after a change means you agree to the new terms.
        </li>

        <li>
          Contact: Questions about these terms are welcome as an issue on <a href={`${REPOSITORY}/issues`} target="_blank" rel="noopener noreferrer">GitHub</a>.
        </li>
      </ol>

      <p>These terms were last updated on October 19, 2026.</p>
      <br />
    </div>
  );
};

export default Terms;
