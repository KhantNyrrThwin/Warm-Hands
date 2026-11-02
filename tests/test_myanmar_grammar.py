"""Myanmar-only output and sentence correction without camera dependencies."""
import unittest

from sign_app.myanmar_grammar import correct_myanmar


class MyanmarGrammarTests(unittest.TestCase):
    def test_i_sick_exact_sentence(self):
        self.assertEqual(correct_myanmar(["I", "Sick"]), "ကျွန်ုပ်နေမကောင်းပါ")

    def test_model_labels_and_subject_reordering(self):
        self.assertEqual(correct_myanmar(["နေမကောင်း  (Sick)", "ကျွန်ုပ်  (I)"]),
                         "ကျွန်ုပ်နေမကောင်းပါ")

    def test_headache(self):
        self.assertEqual(correct_myanmar(["I", "Headache"]), "ကျွန်ုပ်ခေါင်းကိုက်ပါ")

    def test_polite_request(self):
        self.assertEqual(correct_myanmar(["Help", "Please"]), "ကျေးဇူးပြု၍ ကူညီပါ")

    def test_help_uses_object_particle(self):
        self.assertEqual(correct_myanmar(["I", "Help"]), "ကျွန်ုပ်ကိုကူညီပါ")

    def test_medicine_request(self):
        self.assertEqual(correct_myanmar(["Please", "Medicine"]), "ကျေးဇူးပြု၍ ဆေးပေးပါ")

    def test_no_english_fallback(self):
        self.assertEqual(correct_myanmar(["unknown", "arbitrary English"]), "")

    def test_repeats_and_empty_input(self):
        self.assertEqual(correct_myanmar(["I", "Sick", "Sick"]), "ကျွန်ုပ်နေမကောင်းပါ")
        self.assertEqual(correct_myanmar([]), "")


if __name__ == "__main__":
    unittest.main()
