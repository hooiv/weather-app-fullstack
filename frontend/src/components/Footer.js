import React from 'react';

const Footer = ({ yourName }) => {
    return (
        <footer className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500">
            <p className="mb-2">Developed by: {"Aditya Chauhan"}</p>
            <p className="font-semibold">About Product Manager Accelerator (PMA):</p>
            <p className="mb-2">
            From entry-level to VP of Product, we support PM professionals through every stage of their careers.

</p>
            <a
                href="https://www.linkedin.com/school/pmaccelerator/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
            >
                Visit PMA on LinkedIn
            </a>
        </footer>
    );
};

export default Footer;