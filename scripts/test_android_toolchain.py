import unittest
from check_android_toolchain import AGP, DIST_SHA, DIST_URL, JAR_SHA, validate

BUILD = "classpath 'com.android.tools.build:gradle:" + AGP + "'"
PROPS = f"distributionUrl={DIST_URL}\ndistributionSha256Sum={DIST_SHA}\nvalidateDistributionUrl=true\n"


class ToolchainTests(unittest.TestCase):
    def test_exact_pins(self):
        validate(BUILD, PROPS, JAR_SHA)

    def test_agp_drift_or_duplicate(self):
        for build in (BUILD.replace(AGP, '9.5.0'), BUILD + '\n' + BUILD, ''):
            with self.assertRaises(ValueError):
                validate(build, PROPS, JAR_SHA)

    def test_distribution_drift(self):
        for props in (PROPS.replace('9.6.1', '9.6.0'), PROPS.replace('services.gradle.org', 'example.org'), PROPS.replace('-all.zip', '-bin.zip')):
            with self.assertRaises(ValueError):
                validate(BUILD, props, JAR_SHA)

    def test_checksum_drift_or_missing(self):
        for props in (PROPS.replace(DIST_SHA, '0'*64), PROPS.replace('distributionSha256Sum=', 'unused=')):
            with self.assertRaises(ValueError):
                validate(BUILD, props, JAR_SHA)

    def test_duplicate_property(self):
        with self.assertRaises(ValueError):
            validate(BUILD, PROPS + 'distributionUrl=bad\n', JAR_SHA)

    def test_url_validation_disabled(self):
        with self.assertRaises(ValueError):
            validate(BUILD, PROPS.replace('true', 'false'), JAR_SHA)

    def test_wrapper_jar_drift(self):
        with self.assertRaises(ValueError):
            validate(BUILD, PROPS, '0'*64)


if __name__ == '__main__':
    unittest.main()
