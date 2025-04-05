import React from 'react';

const Footer = ({ yourName }) => {
    return (
        <footer className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500">
            <p className="mb-2">Developed by: {yourName}</p>
            <p className="font-semibold">About Product Manager Accelerator (PMA):</p>
            <p className="mb-2">
                 PMA is dedicated to empowering the next generation of product leaders. We provide comprehensive training, mentorship, and resources to help aspiring and current product managers excel in their careers and drive innovation.
            </p>
            <a
                href="https://www.linkedin.com/company/product-manager-accelerator/"
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