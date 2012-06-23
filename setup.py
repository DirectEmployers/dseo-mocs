from distutils.core import setup
from setuptools import find_packages
setup(
    name = "dseo-mocs",
    version = "1.0",
    description = "MOC & O*NET mapping utilities for Django.",
    author = "DirectEmployers Foundation",
    author_email = "matt@directemployersfoundation.org",
    long_description = open('README.rst', 'r').read(),
    package_data = {
        'moc_coding': [
            'tests/factories.py'
        ]
    }
    packages = ['moc_coding'],
    classifiers = [
        'Intended Audience :: Developers',
        'License :: OSI Approved :: BSD License',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Topic :: Internet :: WWW/HTTP :: Indexing/Search'
    ],
    url = 'http://github.com/DirectEmployers/dseo-mocs
)
