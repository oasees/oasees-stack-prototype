# Logistic Regression

## Introduction

Logistic Regression is a statistical method for analyzing datasets in which there are one or more independent variables that determine an outcome. The outcome is typically binary (0/1, True/False, Yes/No).

The goal of Logistic Regression is to model the probability that a given input point belongs to a certain class. The model is represented by the equation:

$$ P(Y=1|X) = \frac{1}{1 + e^{-(\beta_0 + \beta_1X_1 + \beta_2X_2 + ... + \beta_nX_n)}} $$

where:
- $$ P(Y=1|X) $$  is the probability that the outcome is 1 given the input features.
- $$ \beta_0 $$  is the intercept.
- $$ \beta_1, \beta_2, ..., \beta_n $$  are the coefficients for the input features $$ X_1, X_2, ..., X_n $$ .

## Steps to Perform Logistic Regression

1. **Data Collection**: Collect data for the independent variables (features) and the dependent variable (binary outcome).
2. **Exploratory Data Analysis (EDA)**: Visualize the data and compute summary statistics.
3. **Fit the Model**: Use statistical software or machine learning libraries to estimate the parameters $$ \beta_0, \beta_1, ..., \beta_n $$ .
4. **Make Predictions**: Use the fitted model to predict the probability of the outcome.
5. **Evaluate the Model**: Assess the model's performance using metrics like accuracy, precision, recall, F1-score, and the area under the ROC curve (AUC).

## Example

Let's go through an example to illustrate the steps involved in performing Logistic Regression.

### Step 1: Data Collection

Assume we have the following data:

| Hours Studied (X) | Passed Exam (Y) |
|-------------------|-----------------|
| 1                 | 0               |
| 2                 | 0               |
| 3                 | 0               |
| 4                 | 1               |
| 5                 | 1               |

### Step 2: Exploratory Data Analysis

Plot the data:

![Scatter Plot](scatter_plot.png)

### Step 3: Fit the Model

We use the maximum likelihood estimation (MLE) method to fit the logistic regression model. The model is given by:

$$ P(Y=1|X) = \frac{1}{1 + e^{-(\beta_0 + \beta_1X)}} $$

The parameters $$ \beta_0 $$  and $$ \beta_1 $$  are estimated from the data.

### Step 4: Make Predictions

Using the fitted model, we can predict the probability of passing the exam for a given number of hours studied. For example, if a student studies for 3.5 hours:

$$ P(Y=1|X=3.5) = \frac{1}{1 + e^{-(\beta_0 + \beta_1 \cdot 3.5)}} $$

### Step 5: Evaluate the Model

We can evaluate the model using various metrics. One common metric is the accuracy, which is the proportion of correct predictions. Other metrics include precision, recall, F1-score, and AUC.

## Conclusion

Logistic Regression is a powerful and widely-used technique for binary classification problems. It provides a probabilistic framework for modeling the relationship between input features and the binary outcome.

## References

- [Logistic Regression - Wikipedia](https://en.wikipedia.org/wiki/Logistic_regression)
- [Introduction to Logistic Regression](https://www.statisticssolutions.com/free-resources/directory-of-statistical-analyses/logistic-regression/)
